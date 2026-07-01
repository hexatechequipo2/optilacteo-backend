import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../user/enums/role.enum';
import { USER_REPOSITORY } from '../user/repository/user-repository.interface';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { REVOKED_TOKEN_REPOSITORY } from './repository/revoked-token-repository.interface';

// Mock a nivel de modulo para evitar el problema con ESModules de bcrypt.
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));
import * as bcrypt from 'bcrypt';

const activeUser = {
  id: 1,
  email: 'admin@empresa.com',
  password: 'hash_seguro',
  role: Role.ADMIN,
  isActive: true,
  failedLoginAttempts: 0,
  lockedUntil: null,
  empresa: { id: 1, empresaId: 1, name: 'LacteosNorte' },
};

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepository: {
    findByEmail: jest.Mock;
    incrementFailedAttempts: jest.Mock;
    lockUser: jest.Mock;
    resetFailedAttempts: jest.Mock;
  };
  let mockRevokedTokenRepository: { createRevokedToken: jest.Mock };
  let mockJwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  const bcryptCompare = bcrypt.compare as jest.Mock;

  beforeEach(async () => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      incrementFailedAttempts: jest.fn().mockResolvedValue(undefined),
      lockUser: jest.fn().mockResolvedValue(undefined),
      resetFailedAttempts: jest.fn().mockResolvedValue(undefined),
    };
    mockRevokedTokenRepository = { createRevokedToken: jest.fn() };
    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('token_jwt_firmado'),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        {
          provide: REVOKED_TOKEN_REPOSITORY,
          useValue: mockRevokedTokenRepository,
        },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockJwtService.signAsync.mockResolvedValue('token_jwt_firmado');
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
      expect(result.user.role).toBe(Role.ADMIN);
      expect(result.user.empresa).toBe('LacteosNorte');
      // Se verifica que empresaId del payload JWT corresponde al id de la empresa del usuario
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: activeUser.id,
        email: activeUser.email,
        role: activeUser.role,
        empresaId: activeUser.empresa.id,
      });
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
        role: Role.ADMIN,
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
      expect(result).toEqual({ message: 'Sesion cerrada correctamente' });
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
});
