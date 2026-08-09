import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../../auth/types/jwt-payload.type';
import { LecturaResponseDto } from '../dto/lectura-response.dto';

const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

function allowedOrigins(): string[] {
  return (process.env.FRONTEND_URL ?? DEFAULT_FRONTEND_URL)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
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
export class LecturasGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(LecturasGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(`Conexión WS rechazada (sin token): ${client.id}`);
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      if (payload.empresaId == null) {
        client.disconnect(true);
        return;
      }
      client.data.empresaId = payload.empresaId;
      await client.join(this.room(payload.empresaId));
    } catch {
      this.logger.warn(`Conexión WS rechazada (token inválido): ${client.id}`);
      client.disconnect(true);
    }
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
}
