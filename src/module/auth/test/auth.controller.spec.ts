import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { LoginDto } from '../dto/login.dto';
import type { AuthenticatedRequest } from '../guards/jwt-auth.guard';
import { ROLES } from '../../rol/constants/roles.constants';

const successfulLoginResponse = {
  access_token: 'token_jwt_firmado',
  refresh_token: 'refresh_token_plano',
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
  let mockAuthService: {
    login: jest.Mock;
    logout: jest.Mock;
    refresh: jest.Mock;
  };

  beforeEach(async () => {
    mockAuthService = { login: jest.fn(), logout: jest.fn(), refresh: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

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
        refresh_token: 'refresh_token_plano',
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
      expect(mockAuthService.logout).toHaveBeenCalledWith(
        'token_jwt_firmado',
        undefined,
      );
      expect(result).toEqual({ message: 'Sesion cerrada correctamente' });
    });

    it('deberia reenviar el refresh_token al servicio cuando viene en el body', async () => {
      // Arrange
      const request = {
        accessToken: 'token_jwt_firmado',
      } as AuthenticatedRequest;
      mockAuthService.logout.mockResolvedValue({
        message: 'Sesion cerrada correctamente',
      });

      // Act
      await controller.logout(request, { refresh_token: 'refresh_plano' });

      // Assert
      expect(mockAuthService.logout).toHaveBeenCalledWith(
        'token_jwt_firmado',
        'refresh_plano',
      );
    });
  });

  describe('POST /refresh', () => {
    it('deberia devolver un nuevo access_token y refresh_token', async () => {
      // Arrange
      const refreshResponse = {
        access_token: 'nuevo_access_token',
        refresh_token: 'nuevo_refresh_token',
      };
      mockAuthService.refresh.mockResolvedValue(refreshResponse);

      // Act
      const result = await controller.refresh({
        refresh_token: 'refresh_token_viejo',
      });

      // Assert
      expect(mockAuthService.refresh).toHaveBeenCalledWith(
        'refresh_token_viejo',
      );
      expect(result).toEqual(refreshResponse);
    });

    it('deberia propagar la excepcion cuando el refresh_token es invalido', async () => {
      // Arrange
      mockAuthService.refresh.mockRejectedValue(
        new Error('Refresh token inválido'),
      );

      // Act & Assert
      await expect(
        controller.refresh({ refresh_token: 'invalido' }),
      ).rejects.toThrow('Refresh token inválido');
    });
  });
});