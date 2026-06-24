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
  empresa: { id: 1, tenantId: 'empresa-1', name: 'LacteosNorte' },
};

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepository: { findByEmail: jest.Mock };
  let mockRevokedTokenRepository: { createRevokedToken: jest.Mock };
  let mockJwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  const bcryptCompare = bcrypt.compare as jest.Mock;

  beforeEach(async () => {
    mockUserRepository = { findByEmail: jest.fn() };
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
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: activeUser.id,
        email: activeUser.email,
        role: activeUser.role,
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

  describe('logout - caso exitoso', () => {
    it('deberia revocar el token recibido y retornar mensaje de exito', async () => {
      // Arrange
      const accessToken = 'token_jwt_firmado';
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        email: 'admin@empresa.com',
        role: Role.ADMIN,
        tenant_id: 'empresa-1',
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
          tenantId: 'empresa-1',
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
