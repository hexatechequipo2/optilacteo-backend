import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLES } from '../../rol/constants/roles.constants';
import { USER_REPOSITORY } from '../../user/repository/user-repository.interface';
import { AuthService } from '../auth.service';
import { LoginDto } from '../dto/login.dto';
import { REVOKED_TOKEN_REPOSITORY } from '../repository/revoked-token-repository.interface';
import { REFRESH_TOKEN_REPOSITORY } from '../repository/refresh-token-repository.interface';

// Mock a nivel de modulo para evitar el problema con ESModules de bcrypt.
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));
import * as bcrypt from 'bcrypt';

const activeUser = {
  id: 1,
  email: 'admin@empresa.com',
  password: 'hash_seguro',
  rol: {
    id: 1,
    nombre: ROLES.ADMINISTRADOR,
    permisos: [],
  },
  isActive: true,
  failedLoginAttempts: 0,
  lockedUntil: null,
  empresa: { id: 1, name: 'LacteosNorte' },
};

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepository: {
    findByEmail: jest.Mock;
    findById: jest.Mock;
    incrementFailedAttempts: jest.Mock;
    lockUser: jest.Mock;
    resetFailedAttempts: jest.Mock;
  };
  let mockRevokedTokenRepository: { createRevokedToken: jest.Mock };
  let mockRefreshTokenRepository: {
    create: jest.Mock;
    findActiveByTokenHash: jest.Mock;
    findByTokenHash: jest.Mock;
    revokeById: jest.Mock;
    revokeFamily: jest.Mock;
  };
  let mockJwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let mockConfigService: { get: jest.Mock };
  const bcryptCompare = bcrypt.compare as jest.Mock;

  beforeEach(async () => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      incrementFailedAttempts: jest.fn().mockResolvedValue(undefined),
      lockUser: jest.fn().mockResolvedValue(undefined),
      resetFailedAttempts: jest.fn().mockResolvedValue(undefined),
    };
    mockRevokedTokenRepository = { createRevokedToken: jest.fn() };
    mockRefreshTokenRepository = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      findActiveByTokenHash: jest.fn(),
      findByTokenHash: jest.fn(),
      revokeById: jest.fn().mockResolvedValue(undefined),
      revokeFamily: jest.fn().mockResolvedValue(undefined),
    };
    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('token_jwt_firmado'),
      verifyAsync: jest.fn(),
    };
    mockConfigService = { get: jest.fn().mockReturnValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        {
          provide: REVOKED_TOKEN_REPOSITORY,
          useValue: mockRevokedTokenRepository,
        },
        {
          provide: REFRESH_TOKEN_REPOSITORY,
          useValue: mockRefreshTokenRepository,
        },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockJwtService.signAsync.mockResolvedValue('token_jwt_firmado');
    mockRefreshTokenRepository.create.mockResolvedValue({ id: 1 });
    mockConfigService.get.mockReturnValue(undefined);
  });

  describe('login - caso exitoso', () => {
    it('deberia retornar access_token y datos del usuario cuando las credenciales son correctas', async () => {
      // Arrange
      const dto: LoginDto = {
        email: 'admin@empresa.com',
        password: 'clave123',
      };
      mockUserRepository.findByEmail.mockResolvedValue(activeUser);
      bcryptCompare.mockResolvedValue(true);

      // Act
      const result = await service.login(dto);

      // Assert
      expect(result.access_token).toBe('token_jwt_firmado');
      expect(result.user.id).toBe(1);
      expect(result.user.email).toBe('admin@empresa.com');
      expect(result.user.rolId).toBe(1);
      expect(result.user.rolNombre).toBe(ROLES.ADMINISTRADOR);
      expect(result.user.empresa).toBe('LacteosNorte');
      expect(result.user.empresaId).toBe(activeUser.empresa.id);
      // Se verifica que el payload JWT incluye rol, permisos y empresa correctos
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: activeUser.id,
        email: activeUser.email,
        rolId: activeUser.rol.id,
        rolNombre: activeUser.rol.nombre,
        permisos: [],
        empresaId: activeUser.empresa.id,
        jti: '',
      });
    });

    it('deberia retornar rolId y rolNombre en null cuando el usuario no tiene rol asignado', async () => {
      // Arrange
      const userSinRol = { ...activeUser, rol: null };
      const dto: LoginDto = {
        email: 'admin@empresa.com',
        password: 'clave123',
      };
      mockUserRepository.findByEmail.mockResolvedValue(userSinRol);
      bcryptCompare.mockResolvedValue(true);

      // Act
      const result = await service.login(dto);

      // Assert
      expect(result.user.rolId).toBeNull();
      expect(result.user.rolNombre).toBeNull();
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ rolId: null, rolNombre: null, permisos: [] }),
      );
    });
  });

  describe('login - rememberMe', () => {
    it('deberia usar REFRESH_TOKEN_EXPIRES_DAYS (corto) cuando rememberMe es false u omitido', async () => {
      // Arrange
      const dto: LoginDto = {
        email: 'admin@empresa.com',
        password: 'clave123',
        rememberMe: false,
      };
      mockUserRepository.findByEmail.mockResolvedValue(activeUser);
      bcryptCompare.mockResolvedValue(true);
      mockConfigService.get.mockImplementation((key: string) =>
        key === 'REFRESH_TOKEN_EXPIRES_DAYS' ? 7 : undefined,
      );

      // Act
      await service.login(dto);

      // Assert
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'REFRESH_TOKEN_EXPIRES_DAYS',
      );
      expect(mockConfigService.get).not.toHaveBeenCalledWith(
        'REFRESH_TOKEN_EXPIRES_DAYS_REMEMBER_ME',
      );

      const createdArgs = mockRefreshTokenRepository.create.mock.calls[0][0];
      const diffDays = Math.round(
        (createdArgs.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(7);
    });

    it('deberia usar REFRESH_TOKEN_EXPIRES_DAYS_REMEMBER_ME (largo) cuando rememberMe es true', async () => {
      // Arrange
      const dto: LoginDto = {
        email: 'admin@empresa.com',
        password: 'clave123',
        rememberMe: true,
      };
      mockUserRepository.findByEmail.mockResolvedValue(activeUser);
      bcryptCompare.mockResolvedValue(true);
      mockConfigService.get.mockImplementation((key: string) =>
        key === 'REFRESH_TOKEN_EXPIRES_DAYS_REMEMBER_ME' ? 30 : undefined,
      );

      // Act
      await service.login(dto);

      // Assert
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'REFRESH_TOKEN_EXPIRES_DAYS_REMEMBER_ME',
      );

      const createdArgs = mockRefreshTokenRepository.create.mock.calls[0][0];
      const diffDays = Math.round(
        (createdArgs.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(30);
    });

    it('deberia usar el default de 30 dias cuando rememberMe es true y no hay config', async () => {
      // Arrange
      const dto: LoginDto = {
        email: 'admin@empresa.com',
        password: 'clave123',
        rememberMe: true,
      };
      mockUserRepository.findByEmail.mockResolvedValue(activeUser);
      bcryptCompare.mockResolvedValue(true);

      // Act
      await service.login(dto);

      // Assert
      const createdArgs = mockRefreshTokenRepository.create.mock.calls[0][0];
      const diffDays = Math.round(
        (createdArgs.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(30);
    });
  });

  describe('login - email no registrado', () => {
    it('deberia lanzar UnauthorizedException con mensaje generico cuando el email no existe', async () => {
      // Arrange
      const dto: LoginDto = {
        email: 'noexiste@empresa.com',
        password: 'clave123',
      };
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow(
        'Credenciales incorrectas',
      );
    });
  });

  describe('login - contrasena incorrecta', () => {
    it('deberia lanzar UnauthorizedException con mensaje generico cuando la contrasena no coincide', async () => {
      // Arrange
      const dto: LoginDto = {
        email: 'admin@empresa.com',
        password: 'clave_erronea',
      };
      mockUserRepository.findByEmail.mockResolvedValue(activeUser);
      bcryptCompare.mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow(
        'Credenciales incorrectas',
      );
    });
  });

  describe('login - usuario inactivo', () => {
    it('deberia lanzar ForbiddenException cuando el usuario tiene isActive en false', async () => {
      // Arrange
      const inactiveUser = { ...activeUser, isActive: false };
      const dto: LoginDto = {
        email: 'admin@empresa.com',
        password: 'clave123',
      };
      mockUserRepository.findByEmail.mockResolvedValue(inactiveUser);
      bcryptCompare.mockResolvedValue(true);

      // Act & Assert
      await expect(service.login(dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('login - seguridad del mensaje de error', () => {
    it('no deberia revelar si el email o la contrasena fallaron', async () => {
      // Arrange
      const invalidEmailDto: LoginDto = {
        email: 'noexiste@empresa.com',
        password: 'clave',
      };
      const invalidPasswordDto: LoginDto = {
        email: 'admin@empresa.com',
        password: 'mala',
      };

      mockUserRepository.findByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(activeUser);
      bcryptCompare.mockResolvedValue(false);

      // Act
      let emailError: Error | undefined;
      let passwordError: Error | undefined;
      try {
        await service.login(invalidEmailDto);
      } catch (error) {
        emailError = error as Error;
      }
      try {
        await service.login(invalidPasswordDto);
      } catch (error) {
        passwordError = error as Error;
      }

      // Assert
      expect(emailError?.message).toBe(passwordError?.message);
    });
  });

  describe('login - bloqueo por intentos fallidos', () => {
    it('deberia incrementar el contador de intentos fallidos cuando la contrasena es incorrecta', async () => {
      // Arrange
      const dto: LoginDto = { email: 'admin@empresa.com', password: 'clave_erronea' };
      const userWithAttempts = { ...activeUser, failedLoginAttempts: 2 };
      mockUserRepository.findByEmail.mockResolvedValue(userWithAttempts);
      bcryptCompare.mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(mockUserRepository.incrementFailedAttempts).toHaveBeenCalledWith(1);
    });

    it('deberia bloquear la cuenta cuando se alcanza el limite de intentos fallidos', async () => {
      // Arrange — usuario con 4 intentos fallidos (el proximo es el 5to = limite)
      const dto: LoginDto = { email: 'admin@empresa.com', password: 'clave_erronea' };
      const userAtLimit = { ...activeUser, failedLoginAttempts: 4 };
      mockUserRepository.findByEmail.mockResolvedValue(userAtLimit);
      bcryptCompare.mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(mockUserRepository.incrementFailedAttempts).toHaveBeenCalledWith(1);
      expect(mockUserRepository.lockUser).toHaveBeenCalledWith(
        1,
        expect.any(Date),
      );
    });

    it('deberia lanzar ForbiddenException cuando la cuenta esta bloqueada temporalmente', async () => {
      // Arrange — cuenta bloqueada por 15 minutos mas
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 15);
      const lockedUser = { ...activeUser, lockedUntil: futureDate, failedLoginAttempts: 5 };
      const dto: LoginDto = { email: 'admin@empresa.com', password: 'clave123' };
      mockUserRepository.findByEmail.mockResolvedValue(lockedUser);

      // Act & Assert
      await expect(service.login(dto)).rejects.toThrow(ForbiddenException);
      expect(bcryptCompare).not.toHaveBeenCalled();
    });

    it('deberia permitir login cuando el tiempo de bloqueo ya expiro', async () => {
      // Arrange — bloqueo vencido hace 5 minutos
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 5);
      const expiredLockUser = { ...activeUser, lockedUntil: pastDate, failedLoginAttempts: 5 };
      const dto: LoginDto = { email: 'admin@empresa.com', password: 'clave123' };
      mockUserRepository.findByEmail.mockResolvedValue(expiredLockUser);
      bcryptCompare.mockResolvedValue(true);

      // Act
      const result = await service.login(dto);

      // Assert
      expect(result.access_token).toBe('token_jwt_firmado');
      expect(mockUserRepository.resetFailedAttempts).toHaveBeenCalledWith(1);
    });

    it('deberia resetear el contador de intentos fallidos cuando el login es exitoso', async () => {
      // Arrange — usuario con intentos fallidos previos
      const userWithPriorAttempts = { ...activeUser, failedLoginAttempts: 3 };
      const dto: LoginDto = { email: 'admin@empresa.com', password: 'clave123' };
      mockUserRepository.findByEmail.mockResolvedValue(userWithPriorAttempts);
      bcryptCompare.mockResolvedValue(true);

      // Act
      const result = await service.login(dto);

      // Assert
      expect(result.access_token).toBe('token_jwt_firmado');
      expect(mockUserRepository.resetFailedAttempts).toHaveBeenCalledWith(1);
    });

    it('no deberia llamar a resetFailedAttempts si el usuario no tenia intentos fallidos previos', async () => {
      // Arrange
      const dto: LoginDto = { email: 'admin@empresa.com', password: 'clave123' };
      mockUserRepository.findByEmail.mockResolvedValue(activeUser);
      bcryptCompare.mockResolvedValue(true);

      // Act
      await service.login(dto);

      // Assert
      expect(mockUserRepository.resetFailedAttempts).not.toHaveBeenCalled();
    });
  });

  describe('logout - caso exitoso', () => {
    it('deberia revocar el token recibido y retornar mensaje de exito', async () => {
      // Arrange
      const accessToken = 'token_jwt_firmado';
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        email: 'admin@empresa.com',
        rolId: 1,
        rolNombre: ROLES.ADMINISTRADOR,
        empresaId: 1,
        jti: 'session-id',
        exp: 1760000000,
      });
      mockRevokedTokenRepository.createRevokedToken.mockResolvedValue({
        id: 1,
      });

      // Act
      const result = await service.logout(accessToken);

      // Assert
      expect(result).toEqual({ message: 'Sesión cerrada correctamente' });
      expect(
        mockRevokedTokenRepository.createRevokedToken,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenHash: AuthService.hashToken(accessToken),
          userId: 1,
          empresaId: 1,
          expiresAt: new Date(1760000000 * 1000),
        }),
      );
      expect(mockRefreshTokenRepository.revokeFamily).not.toHaveBeenCalled();
    });

    it('deberia revocar tambien la familia del refresh_token cuando se envia', async () => {
      // Arrange
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        email: 'admin@empresa.com',
        empresaId: 1,
        exp: 1760000000,
      });
      mockRevokedTokenRepository.createRevokedToken.mockResolvedValue({
        id: 1,
      });
      mockRefreshTokenRepository.findByTokenHash.mockResolvedValue({
        id: 10,
        familyId: 'family-123',
      });

      // Act
      await service.logout('token_jwt_firmado', 'refresh_plano');

      // Assert
      expect(mockRefreshTokenRepository.revokeFamily).toHaveBeenCalledWith(
        'family-123',
      );
    });

    it('deberia lanzar UnauthorizedException cuando el token es invalido', async () => {
      // Arrange
      mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

      // Act & Assert
      await expect(service.logout('token_invalido')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('deberia emitir un access_token y refresh_token nuevos cuando el token es valido', async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      mockRefreshTokenRepository.findByTokenHash.mockResolvedValue({
        id: 5,
        userId: 1,
        empresaId: 1,
        familyId: 'family-123',
        expiresAt: futureDate,
        revokedAt: null,
      });
      mockUserRepository.findById.mockResolvedValue(activeUser);

      // Act
      const result = await service.refresh('refresh_valido');

      // Assert
      expect(result.access_token).toBe('token_jwt_firmado');
      expect(typeof result.refresh_token).toBe('string');
      expect(mockRefreshTokenRepository.revokeById).toHaveBeenCalledWith(
        5,
        expect.any(String),
      );
      expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          empresaId: 1,
          familyId: 'family-123',
          expiresAt: futureDate,
        }),
      );
    });

    it('deberia lanzar UnauthorizedException cuando el refresh_token no existe', async () => {
      // Arrange
      mockRefreshTokenRepository.findByTokenHash.mockResolvedValue(null);

      // Act & Assert
      await expect(service.refresh('inexistente')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deberia lanzar UnauthorizedException y revocar la familia cuando el refresh_token ya fue usado (reuso)', async () => {
      // Arrange
      mockRefreshTokenRepository.findByTokenHash.mockResolvedValue({
        id: 5,
        userId: 1,
        empresaId: 1,
        familyId: 'family-123',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        revokedAt: new Date(),
      });

      // Act & Assert
      await expect(service.refresh('reusado')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockRefreshTokenRepository.revokeFamily).toHaveBeenCalledWith(
        'family-123',
      );
    });

    it('deberia lanzar UnauthorizedException cuando el refresh_token esta expirado', async () => {
      // Arrange
      mockRefreshTokenRepository.findByTokenHash.mockResolvedValue({
        id: 5,
        userId: 1,
        empresaId: 1,
        familyId: 'family-123',
        expiresAt: new Date(Date.now() - 1000),
        revokedAt: null,
      });

      // Act & Assert
      await expect(service.refresh('expirado')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockRefreshTokenRepository.revokeFamily).not.toHaveBeenCalled();
    });

    it('deberia lanzar UnauthorizedException cuando el usuario ya no esta activo', async () => {
      // Arrange
      mockRefreshTokenRepository.findByTokenHash.mockResolvedValue({
        id: 5,
        userId: 1,
        empresaId: 1,
        familyId: 'family-123',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        revokedAt: null,
      });
      mockUserRepository.findById.mockResolvedValue({
        ...activeUser,
        isActive: false,
      });

      // Act & Assert
      await expect(service.refresh('valido_pero_usuario_inactivo')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});