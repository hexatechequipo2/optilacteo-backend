import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../user/enums/role.enum';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import type { AuthenticatedRequest } from './guards/jwt-auth.guard';

const successfulLoginResponse = {
  access_token: 'token_jwt_firmado',
  user: {
    id: 1,
    email: 'admin@empresa.com',
    role: Role.ADMIN,
    empresa: 'LacteosNorte',
  },
};

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: { login: jest.Mock; logout: jest.Mock };

  beforeEach(async () => {
    mockAuthService = { login: jest.fn(), logout: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('POST /api/v1/auth/login', () => {
    it('deberia retornar access_token y datos del usuario cuando el login es exitoso', async () => {
      // Arrange
      const dto: LoginDto = {
        email: 'admin@empresa.com',
        password: 'clave123',
      };
      mockAuthService.login.mockResolvedValue(successfulLoginResponse);

      // Act
      const result = await controller.login(dto);

      // Assert
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(successfulLoginResponse);
    });

    it('deberia propagar la excepcion del servicio cuando las credenciales son invalidas', async () => {
      // Arrange
      const dto: LoginDto = { email: 'noexiste@empresa.com', password: 'mala' };
      mockAuthService.login.mockRejectedValue(
        new Error('Credenciales incorrectas'),
      );

      // Act & Assert
      await expect(controller.login(dto)).rejects.toThrow(
        'Credenciales incorrectas',
      );
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('deberia cerrar sesion usando el token autenticado', async () => {
      // Arrange
      const request = {
        accessToken: 'token_jwt_firmado',
      } as AuthenticatedRequest;
      mockAuthService.logout.mockResolvedValue({
        message: 'Sesion cerrada correctamente',
      });

      // Act
      const result = await controller.logout(request);

      // Assert
      expect(mockAuthService.logout).toHaveBeenCalledWith('token_jwt_firmado');
      expect(result).toEqual({ message: 'Sesion cerrada correctamente' });
    });
  });
});
