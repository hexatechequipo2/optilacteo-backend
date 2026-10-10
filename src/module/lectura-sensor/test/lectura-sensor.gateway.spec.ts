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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await gateway.handleConnection(client);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await gateway.handleConnection(client);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(client.disconnect).toHaveBeenCalledWith(true);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await gateway.handleConnection(client);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await gateway.handleConnection(client);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(client.disconnect).toHaveBeenCalledWith(true);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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

    describe('handleConnection — conexiones válidas e inválidas restantes', () => {
    let warnSpy: jest.SpyInstance;

    const crearCliente = (auth: any = { token: 'jwt' }, query: any = {}) =>
      ({
        id: 's1',
        handshake: { auth, query },
        data: {},
        join: jest.fn(),
        disconnect: jest.fn(),
      }) as any;

    beforeEach(() => {
      warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    });
    afterEach(() => warnSpy.mockRestore());

    it('acepta la conexión, guarda la sesión y une al cliente a la room de su empresa', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({ empresaId: 5, sub: 9 });
      revokedTokenRepoMock.existsActiveByTokenHash.mockResolvedValue(false);
      userRepoMock.findById.mockResolvedValue({ id: 9, isActive: true });
      const client = crearCliente();

      await gateway.handleConnection(client);

      expect(client.join).toHaveBeenCalledWith('empresa:5');
      expect(client.data).toEqual({ empresaId: 5, userId: 9, tokenHash: expect.any(String) });
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('toma el token del query string si no viene en auth', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({ empresaId: 5, sub: 9 });
      revokedTokenRepoMock.existsActiveByTokenHash.mockResolvedValue(false);
      userRepoMock.findById.mockResolvedValue({ id: 9, isActive: true });

      await gateway.handleConnection(crearCliente({}, { token: 'jwt-query' }));

      expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith('jwt-query');
    });

    it('rechaza si el token del query no es un string', async () => {
      const client = crearCliente({}, { token: ['a', 'b'] });

      await gateway.handleConnection(client);

      expect(jwtServiceMock.verifyAsync).not.toHaveBeenCalled();
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it.each([
      ['no existe', null],
      ['está inactivo', { id: 9, isActive: false }],
    ])('rechaza si el usuario %s', async (_label, user) => {
      jwtServiceMock.verifyAsync.mockResolvedValue({ empresaId: 5, sub: 9 });
      revokedTokenRepoMock.existsActiveByTokenHash.mockResolvedValue(false);
      userRepoMock.findById.mockResolvedValue(user);
      const client = crearCliente();

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('revalidateAllSockets', () => {
    let warnSpy: jest.SpyInstance;
    const crearSocket = (data: any) => ({ data, disconnect: jest.fn() });
    const revalidar = () => (gateway as any).revalidateAllSockets();

    beforeEach(() => {
      warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    });
    afterEach(() => warnSpy.mockRestore());

    it('desconecta los sockets sin sesión', async () => {
      const socket = crearSocket(undefined);
      serverMock.fetchSockets.mockResolvedValue([socket]);

      await revalidar();

      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('desconecta los sockets cuyo token fue revocado, sin consultar al usuario', async () => {
      const socket = crearSocket({ userId: 1, tokenHash: 'h' });
      serverMock.fetchSockets.mockResolvedValue([socket]);
      revokedTokenRepoMock.existsActiveByTokenHash.mockResolvedValue(true);
      userRepoMock.findById.mockClear();

      await revalidar();

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(userRepoMock.findById).not.toHaveBeenCalled();
    });

    it.each([
      ['no existe', null],
      ['está inactivo', { isActive: false }],
    ])('desconecta los sockets cuyo usuario %s', async (_label, user) => {
      const socket = crearSocket({ userId: 1, tokenHash: 'h' });
      serverMock.fetchSockets.mockResolvedValue([socket]);
      revokedTokenRepoMock.existsActiveByTokenHash.mockResolvedValue(false);
      userRepoMock.findById.mockResolvedValue(user);

      await revalidar();

      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('mantiene conectados los sockets con sesión vigente', async () => {
      const socket = crearSocket({ userId: 1, tokenHash: 'h' });
      serverMock.fetchSockets.mockResolvedValue([socket]);
      revokedTokenRepoMock.existsActiveByTokenHash.mockResolvedValue(false);
      userRepoMock.findById.mockResolvedValue({ isActive: true });

      await revalidar();

      expect(socket.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('revalidación periódica y ciclo de vida', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    const crear = () =>
      new LecturasGateway(jwtServiceMock as any, revokedTokenRepoMock as any, userRepoMock as any);

    it('revalida cada 2 minutos y deja de hacerlo al destruir el módulo', () => {
      const spy = jest
        .spyOn(LecturasGateway.prototype as any, 'revalidateAllSockets')
        .mockResolvedValue(undefined);
      const g = crear();

      jest.advanceTimersByTime(2 * 60 * 1000);
      expect(spy).toHaveBeenCalledTimes(1);

      g.onModuleDestroy();
      jest.advanceTimersByTime(10 * 60 * 1000);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('onModuleDestroy no falla si no hay timer', () => {
      const g = crear();
      (g as any).revalidationTimer = undefined;

      expect(() => g.onModuleDestroy()).not.toThrow();
    });
  });
});
