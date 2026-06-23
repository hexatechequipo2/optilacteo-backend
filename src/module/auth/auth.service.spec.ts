import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../user/enums/role.enum';
import { USER_REPOSITORY } from '../user/repository/user-repository.interface';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

// Mock a nivel de módulo para evitar el problema con ESModules de bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));
import * as bcrypt from 'bcrypt';

// Usuario base reutilizado en varios casos
const usuarioActivo = {
  id: 1,
  email: 'admin@empresa.com',
  password: 'hash_seguro',
  role: Role.ADMIN,
  isActive: true,
  empresa: { name: 'LácteosNorte' },
};

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepository: { findByEmail: jest.Mock };
  let mockJwtService: { signAsync: jest.Mock };
  const bcryptCompare = bcrypt.compare as jest.Mock;

  beforeEach(async () => {
    mockUserRepository = { findByEmail: jest.fn() };
    mockJwtService = { signAsync: jest.fn().mockResolvedValue('token_jwt_firmado') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockJwtService.signAsync.mockResolvedValue('token_jwt_firmado');
  });

  describe('login - caso exitoso', () => {
    it('debería retornar access_token y datos del usuario cuando las credenciales son correctas', async () => {
      // Arrange
      const dto: LoginDto = { email: 'admin@empresa.com', password: 'clave123' };
      mockUserRepository.findByEmail.mockResolvedValue(usuarioActivo);
      bcryptCompare.mockResolvedValue(true);

      // Act
      const result = await service.login(dto);

      // Assert
      expect(result.access_token).toBe('token_jwt_firmado');
      expect(result.user.id).toBe(1);
      expect(result.user.email).toBe('admin@empresa.com');
      expect(result.user.role).toBe(Role.ADMIN);
      expect(result.user.empresa).toBe('LácteosNorte');
    });
  });

  describe('login - email no registrado', () => {
    it('debería lanzar UnauthorizedException con mensaje genérico cuando el email no existe', async () => {
      // Arrange
      const dto: LoginDto = { email: 'noexiste@empresa.com', password: 'clave123' };
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow('Credenciales incorrectas');
    });
  });

  describe('login - contraseña incorrecta', () => {
    it('debería lanzar UnauthorizedException con mensaje genérico cuando la contraseña no coincide', async () => {
      // Arrange
      const dto: LoginDto = { email: 'admin@empresa.com', password: 'clave_erronea' };
      mockUserRepository.findByEmail.mockResolvedValue(usuarioActivo);
      bcryptCompare.mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow('Credenciales incorrectas');
    });
  });

  describe('login - usuario inactivo', () => {
    it('debería lanzar ForbiddenException cuando el usuario tiene isActive en false', async () => {
      // Arrange
      const usuarioInactivo = { ...usuarioActivo, isActive: false };
      const dto: LoginDto = { email: 'admin@empresa.com', password: 'clave123' };
      mockUserRepository.findByEmail.mockResolvedValue(usuarioInactivo);
      bcryptCompare.mockResolvedValue(true);

      // Act & Assert
      await expect(service.login(dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('login - seguridad del mensaje de error', () => {
    it('no debería revelar si el email o la contraseña fallaron (mismo mensaje en ambos casos)', async () => {
      // Arrange
      const dtoEmailInvalido: LoginDto = { email: 'noexiste@empresa.com', password: 'clave' };
      const dtoPasswordInvalida: LoginDto = { email: 'admin@empresa.com', password: 'mala' };

      mockUserRepository.findByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(usuarioActivo);
      bcryptCompare.mockResolvedValue(false);

      // Act
      let errorEmail: Error | undefined;
      let errorPassword: Error | undefined;
      try { await service.login(dtoEmailInvalido); } catch (e) { errorEmail = e as Error; }
      try { await service.login(dtoPasswordInvalida); } catch (e) { errorPassword = e as Error; }

      // Assert — ambos errores son iguales para no filtrar información
      expect(errorEmail?.message).toBe(errorPassword?.message);
    });
  });
});
