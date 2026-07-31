import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { NotificacionesGateway } from '../gateway/notificaciones.gateway';
import { NotificacionResponseDto } from '../dto/notificacion-response.dto';
import { JwtPayload } from '../../auth/types/jwt-payload.type';

describe('NotificacionesGateway', () => {
  let gateway: NotificacionesGateway;
  let jwtServiceMock: jest.Mocked<JwtService>;
  let socketMock: Partial<Socket>;
  let serverMock: Partial<Server>;

  beforeEach(async () => {
    jwtServiceMock = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    socketMock = {
      id: 'socket-123',
      handshake: {
        auth: {},
        query: {},
      } as any,
      data: {},
      disconnect: jest.fn(),
      join: jest.fn().mockResolvedValue(undefined),
    };

    serverMock = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacionesGateway,
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    gateway = module.get<NotificacionesGateway>(NotificacionesGateway);

    // Inyectamos el mock del servidor Socket.io en la propiedad privada @WebSocketServer()
    Object.defineProperty(gateway, 'server', {
      value: serverMock,
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    const validPayload: JwtPayload = {
      sub: 10,
      empresaId: 2,
      email: 'user@test.com',
    } as any;

    it('debe conectar exitosamente extrayendo el token desde handshake.auth', async () => {
      socketMock.handshake!.auth = { token: 'valid-auth-token' };
      jwtServiceMock.verifyAsync.mockResolvedValue(validPayload);

      await gateway.handleConnection(socketMock as Socket);

      expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith('valid-auth-token');
      expect(socketMock.data?.empresaId).toBe(2);
      expect(socketMock.data?.userId).toBe(10);
      expect(socketMock.join).toHaveBeenCalledWith('empresa:2:user:10');
      expect(socketMock.disconnect).not.toHaveBeenCalled();
    });

    it('debe conectar exitosamente extrayendo el token desde handshake.query si no está en auth', async () => {
      socketMock.handshake!.auth = {};
      socketMock.handshake!.query = { token: 'valid-query-token' };
      jwtServiceMock.verifyAsync.mockResolvedValue(validPayload);

      await gateway.handleConnection(socketMock as Socket);

      expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith('valid-query-token');
      expect(socketMock.join).toHaveBeenCalledWith('empresa:2:user:10');
      expect(socketMock.disconnect).not.toHaveBeenCalled();
    });

    it('debe desconectar al cliente si no se provee un token', async () => {
      socketMock.handshake!.auth = {};
      socketMock.handshake!.query = {};

      await gateway.handleConnection(socketMock as Socket);

      expect(socketMock.disconnect).toHaveBeenCalledWith(true);
      expect(jwtServiceMock.verifyAsync).not.toHaveBeenCalled();
    });

    it('debe desconectar al cliente si el payload no incluye empresaId o sub', async () => {
      socketMock.handshake!.auth = { token: 'incomplete-payload-token' };
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: null,
        empresaId: 2,
      } as any);

      await gateway.handleConnection(socketMock as Socket);

      expect(socketMock.disconnect).toHaveBeenCalledWith(true);
      expect(socketMock.join).not.toHaveBeenCalled();
    });

    it('debe rechazar la conexión y desconectar si el token es inválido o expiro', async () => {
      socketMock.handshake!.auth = { token: 'invalid-token' };
      jwtServiceMock.verifyAsync.mockRejectedValue(new Error('Token expirado'));

      await gateway.handleConnection(socketMock as Socket);

      expect(socketMock.disconnect).toHaveBeenCalledWith(true);
      expect(socketMock.join).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('debe ejecutarse sin errores', () => {
      expect(() => gateway.handleDisconnect()).not.toThrow();
    });
  });

  describe('emitirNotificacion', () => {
    it('debe emitir el evento notificacion:nueva al room correspondiente', () => {
      const empresaId = 2;
      const usuarioId = 10;
      const notificacionDto: NotificacionResponseDto = {
        id: 1,
        tipo: 'ALERTA' as any,
        mensaje: 'Nueva notificación de alerta',
        leida: false,
        createdAt: new Date(),
        data: null,
      };

      gateway.emitirNotificacion(notificacionDto, empresaId, usuarioId);

      expect(serverMock.to).toHaveBeenCalledWith('empresa:2:user:10');
      expect(serverMock.emit).toHaveBeenCalledWith(
        'notificacion:nueva',
        notificacionDto,
      );
    });
  });
});