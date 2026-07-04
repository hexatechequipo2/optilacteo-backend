import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { LoginDto } from '../dto/login.dto';
import type { AuthenticatedRequest } from '../guards/jwt-auth.guard';
import { ROLES } from '../../rol/constants/roles.constants';

const successfulLoginResponse = {
  access_token: 'token_jwt_firmado',
  user: {
    id: 1,
    email: 'admin@empresa.com',
    rolId: 1,
    rolNombre: ROLES.ADMINISTRADOR,
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

  describe('POST /login', () => {
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

    it('deberia retornar rolId y rolNombre en null cuando el usuario no tiene rol asignado', async () => {
      // Arrange
      const dto: LoginDto = {
        email: 'sinrol@empresa.com',
        password: 'clave123',
      };
      const responseSinRol = {
        access_token: 'token_jwt_firmado',
        user: {
          id: 2,
          email: 'sinrol@empresa.com',
          rolId: null,
          rolNombre: null,
          empresa: 'LacteosNorte',
        },
      };
      mockAuthService.login.mockResolvedValue(responseSinRol);

      // Act
      const result = await controller.login(dto);

      // Assert
      expect(result).toEqual(responseSinRol);
    });
  });

  describe('POST /logout', () => {
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