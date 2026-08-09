import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { LecturasGateway } from '../gateway/lecturas.gateway';
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

describe('LecturasGateway', () => {
  let gateway: LecturasGateway;

  const jwtServiceMock = {
    verifyAsync: jest.fn(),
  };

  const serverMock = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LecturasGateway,
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    gateway = module.get(LecturasGateway);

    // Inyectar manualmente el server del gateway
    (gateway as any).server = serverMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('debe desconectar cuando no recibe token', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      const client: any = {
        id: 'socket1',
        handshake: {
          auth: {},
          query: {},
        },
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('debe autenticar y unir al cliente a la room correspondiente', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        empresaId: 15,
      });

      const client: any = {
        handshake: {
          auth: {
            token: 'jwt-token',
          },
        },
        data: {},
        join: jest.fn(),
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(client);

      expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith('jwt-token');
      expect(client.data.empresaId).toBe(15);
      expect(client.join).toHaveBeenCalledWith('empresa:15');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('debe desconectar cuando el JWT no posee empresaId', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({});

      const client: any = {
        handshake: {
          auth: {
            token: 'jwt',
          },
        },
        data: {},
        join: jest.fn(),
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(client.join).not.toHaveBeenCalled();
    });

    it('debe desconectar cuando el token es inválido', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      jwtServiceMock.verifyAsync.mockRejectedValue(new Error());

      const client: any = {
        id: 'socket2',
        handshake: {
          auth: {
            token: 'jwt',
          },
        },
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('debe aceptar el token enviado por query', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        empresaId: 22,
      });

      const client: any = {
        handshake: {
          auth: {},
          query: {
            token: 'query-token',
          },
        },
        data: {},
        join: jest.fn(),
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(client);

      expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith('query-token');
      expect(client.join).toHaveBeenCalledWith('empresa:22');
    });
  });

  describe('handleDisconnect', () => {
    it('no debe lanzar errores', () => {
      expect(() => gateway.handleDisconnect()).not.toThrow();
    });
  });

  describe('emitirLectura', () => {
    it('debe emitir el evento lectura:nueva', () => {
      const payload = { id: 1 };

      gateway.emitirLectura(payload as any, 3);

      expect(serverMock.to).toHaveBeenCalledWith('empresa:3');
      expect(serverMock.emit).toHaveBeenCalledWith('lectura:nueva', payload);
    });
  });

  describe('emitirSensorInactivo', () => {
    it('debe emitir el evento sensor:inactivo', () => {
      const payload = { sensorId: 1 };

      gateway.emitirSensorInactivo(payload, 8);

      expect(serverMock.to).toHaveBeenCalledWith('empresa:8');
      expect(serverMock.emit).toHaveBeenCalledWith('sensor:inactivo', payload);
    });
  });

  describe('emitirSensorFalla', () => {
    it('debe emitir el evento sensor:falla', () => {
      const payload = { sensorId: 2 };

      gateway.emitirSensorFalla(payload, 9);

      expect(serverMock.to).toHaveBeenCalledWith('empresa:9');
      expect(serverMock.emit).toHaveBeenCalledWith('sensor:falla', payload);
    });
  });

  describe('emitirSensorRecuperado', () => {
    it('debe emitir el evento sensor:recuperado', () => {
      const payload = { sensorId: 5 };

      gateway.emitirSensorRecuperado(payload, 11);

      expect(serverMock.to).toHaveBeenCalledWith('empresa:11');
      expect(serverMock.emit).toHaveBeenCalledWith(
        'sensor:recuperado',
        payload,
      );
    });
  });
});
