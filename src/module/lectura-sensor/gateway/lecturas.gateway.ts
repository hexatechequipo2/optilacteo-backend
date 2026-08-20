import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../../auth/types/jwt-payload.type';
import { AuthService } from '../../auth/auth.service';
import type { IRevokedTokenRepository } from '../../auth/repository/revoked-token-repository.interface';
import { REVOKED_TOKEN_REPOSITORY } from '../../auth/repository/revoked-token-repository.interface';
import type { IUserRepository } from '../../user/repository/user-repository.interface';
import { USER_REPOSITORY } from '../../user/repository/user-repository.interface';
import { LecturaResponseDto } from '../dto/lectura-response.dto';

const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

// Cada cuánto se revalida la sesión de los sockets ya conectados. No hace
// falta que sea muy agresivo: cubre el caso de logout/desactivación/robo
// de token mientras el socket ya está abierto (ver hallazgos #6 y #7 del
// análisis de auth). 2 minutos es un balance razonable entre carga en DB
// y ventana de exposición.
const REVALIDATION_INTERVAL_MS = 2 * 60 * 1000;

function allowedOrigins(): string[] {
  return (process.env.FRONTEND_URL ?? DEFAULT_FRONTEND_URL)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

interface SocketSessionData {
  empresaId: number;
  userId: number;
  tokenHash: string;
}

// Tiempo real para HU-13: cada cliente se autentica con el mismo JWT que usa
// el resto de la API y se une a una room por empresa, para que el
// aislamiento multi-tenant que TenantScopedRepository da en la base de datos
// también se respete acá (nada de esto pasa automáticamente en un socket).
@WebSocketGateway({
  namespace: '/sensores',
  cors: {
    origin: allowedOrigins(),
    credentials: true,
  },
})
@Injectable()
export class LecturasGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(LecturasGateway.name);
  private revalidationTimer?: NodeJS.Timeout;

  constructor(
    private readonly jwtService: JwtService,

    @Inject(REVOKED_TOKEN_REPOSITORY)
    private readonly revokedTokenRepository: IRevokedTokenRepository,

    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {
    this.revalidationTimer = setInterval(() => {
      void this.revalidateAllSockets();
    }, REVALIDATION_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.revalidationTimer) {
      clearInterval(this.revalidationTimer);
    }
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(`Conexión WS rechazada (sin token): ${client.id}`);
      client.disconnect(true);
      return;
    }

    const session = await this.authenticate(token);

    if (!session) {
      this.logger.warn(`Conexión WS rechazada (token inválido/revocado): ${client.id}`);
      client.disconnect(true);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    client.data = session satisfies SocketSessionData;
    await client.join(this.room(session.empresaId));
  }

  handleDisconnect(): void {
    // Socket.IO limpia las rooms del cliente automáticamente al desconectar.
  }

  emitirLectura(lectura: LecturaResponseDto, empresaId: number): void {
    this.server.to(this.room(empresaId)).emit('lectura:nueva', lectura);
  }

  emitirSensorInactivo(
    payload: Record<string, unknown>,
    empresaId: number,
  ): void {
    this.server.to(this.room(empresaId)).emit('sensor:inactivo', payload);
  }

  emitirSensorFalla(payload: Record<string, unknown>, empresaId: number): void {
    this.server.to(this.room(empresaId)).emit('sensor:falla', payload);
  }

  emitirSensorRecuperado(
    payload: Record<string, unknown>,
    empresaId: number,
  ): void {
    this.server.to(this.room(empresaId)).emit('sensor:recuperado', payload);
  }

  private room(empresaId: number): string {
    return `empresa:${empresaId}`;
  }

  private extractToken(client: Socket): string | undefined {
    const fromAuth = client.handshake.auth?.token as string | undefined;
    if (fromAuth) return fromAuth;

    const fromQuery = client.handshake.query?.token;
    return typeof fromQuery === 'string' ? fromQuery : undefined;
  }

  /**
   * Valida el JWT, chequea que no esté revocado (mismo criterio que
   * JwtAuthGuard en REST) y que el usuario siga activo. Devuelve los datos
   * de sesión a guardar en el socket, o null si algo falla.
   */
  private async authenticate(token: string): Promise<SocketSessionData | null> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      return null;
    }

    if (payload.empresaId == null) {
      return null;
    }

    const tokenHash = AuthService.hashToken(token);

    const isRevoked = await this.revokedTokenRepository.existsActiveByTokenHash(
      tokenHash,
      new Date(),
    );
    if (isRevoked) {
      return null;
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      return null;
    }

    return {
      empresaId: payload.empresaId,
      userId: payload.sub,
      tokenHash,
    };
  }

  /**
   * Recorre todos los sockets conectados en el namespace y desconecta los
   * que tengan el token revocado o el usuario desactivado desde que se
   * conectaron. Cubre el caso de logout/baja de usuario con el socket ya
   * abierto (hallazgo #7: sin esto, la sesión WS vive indefinidamente).
   */
  private async revalidateAllSockets(): Promise<void> {
    const sockets = await this.server.fetchSockets();

    for (const socket of sockets) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const session = socket.data as SocketSessionData | undefined;
      if (!session) {
        socket.disconnect(true);
        continue;
      }

      const isRevoked = await this.revokedTokenRepository.existsActiveByTokenHash(
        session.tokenHash,
        new Date(),
      );

      if (isRevoked) {
        this.logger.warn(
          `Socket desconectado por revocación de token [userId=${session.userId}]`,
        );
        socket.disconnect(true);
        continue;
      }

      const user = await this.userRepository.findById(session.userId);
      if (!user || !user.isActive) {
        this.logger.warn(
          `Socket desconectado por usuario inactivo [userId=${session.userId}]`,
        );
        socket.disconnect(true);
      }
    }
  }
}