import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../user/enums/role.enum';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

const respuestaLoginExitosa = {
  access_token: 'token_jwt_firmado',
  user: {
    id: 1,
    email: 'admin@empresa.com',
    role: Role.ADMIN,
    empresa: 'LácteosNorte',
  },
};

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: { login: jest.Mock };

  beforeEach(async () => {
    mockAuthService = { login: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('POST /api/v1/auth/login', () => {
    it('debería retornar access_token y datos del usuario cuando el login es exitoso', async () => {
      // Arrange
      const dto: LoginDto = { email: 'admin@empresa.com', password: 'clave123' };
      mockAuthService.login.mockResolvedValue(respuestaLoginExitosa);

      // Act
      const result = await controller.login(dto);

      // Assert
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(respuestaLoginExitosa);
    });

    it('debería propagar la excepción del servicio cuando las credenciales son inválidas', async () => {
      // Arrange
      const dto: LoginDto = { email: 'noexiste@empresa.com', password: 'mala' };
      mockAuthService.login.mockRejectedValue(new Error('Credenciales incorrectas'));

      // Act & Assert
      await expect(controller.login(dto)).rejects.toThrow('Credenciales incorrectas');
    });
  });
});
