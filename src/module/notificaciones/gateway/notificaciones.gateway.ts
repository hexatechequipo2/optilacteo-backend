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
import { NotificacionResponseDto } from '../dto/notificacion-response.dto';

const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

function allowedOrigins(): string[] {
  return (process.env.FRONTEND_URL ?? DEFAULT_FRONTEND_URL)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

// Mismo patrón que LecturasGateway (HU-13), pero con room por USUARIO (no
// solo por empresa), porque la notificación es individual al Responsable
// de Calidad.
@WebSocketGateway({
  namespace: '/notificaciones',
  cors: { origin: allowedOrigins(), credentials: true },
})
export class NotificacionesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(NotificacionesGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      if (payload.empresaId == null || payload.sub == null) {
        client.disconnect(true);
        return;
      }
      client.data.empresaId = payload.empresaId;
      client.data.userId = payload.sub;
      await client.join(this.room(payload.empresaId, payload.sub as unknown as number));
    } catch {
      this.logger.warn(`Conexión WS rechazada (token inválido): ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(): void {}

  emitirNotificacion(notificacion: NotificacionResponseDto, empresaId: number, usuarioId: number): void {
    this.server.to(this.room(empresaId, usuarioId)).emit('notificacion:nueva', notificacion);
  }

  private room(empresaId: number, usuarioId: number): string {
    return `empresa:${empresaId}:user:${usuarioId}`;
  }

  private extractToken(client: Socket): string | undefined {
    const fromAuth = client.handshake.auth?.token as string | undefined;
    if (fromAuth) return fromAuth;
    const fromQuery = client.handshake.query?.token;
    return typeof fromQuery === 'string' ? fromQuery : undefined;
  }
}