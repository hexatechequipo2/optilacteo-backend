import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { LecturasGateway } from '../gateway/lecturas.gateway';
import { USER_REPOSITORY } from '../../user/repository/user-repository.interface';
import { REVOKED_TOKEN_REPOSITORY } from '../../auth/repository/revoked-token-repository.interface';

describe('LecturasGateway', () => {
  let gateway: LecturasGateway;

  const jwtServiceMock = { verifyAsync: jest.fn() };
  const serverMock = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    fetchSockets: jest.fn().mockResolvedValue([]), // 👈 agregado
  };

  const userRepoMock = { findById: jest.fn(), findByEmail: jest.fn() };
  const revokedTokenRepoMock = {
    createRevokedToken: jest.fn(),
    findByTokenHash: jest.fn(),
    existsActiveByTokenHash: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LecturasGateway,
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: USER_REPOSITORY, useValue: userRepoMock },
        { provide: REVOKED_TOKEN_REPOSITORY, useValue: revokedTokenRepoMock },
      ],
    }).compile();

    gateway = module.get(LecturasGateway);
    (gateway as any).server = serverMock;
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('debe desconectar cuando no recibe token', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      const client: any = {
        id: 'socket1',
        handshake: { auth: {}, query: {} },
        disconnect: jest.fn(),
      };
      await gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('debe desconectar cuando el JWT no posee empresaId', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({});
      revokedTokenRepoMock.existsActiveByTokenHash.mockResolvedValue(false);

      const client: any = {
        handshake: { auth: { token: 'jwt' } },
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
        handshake: { auth: { token: 'jwt' } },
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('debe desconectar cuando el token está revocado', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({ empresaId: 33 });
      revokedTokenRepoMock.existsActiveByTokenHash.mockResolvedValue(true);

      const client: any = {
        handshake: { auth: { token: 'revoked-token' } },
        data: {},
        join: jest.fn(),
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(client.join).not.toHaveBeenCalled();
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
      expect(serverMock.emit).toHaveBeenCalledWith('sensor:recuperado', payload);
    });
  });
});
