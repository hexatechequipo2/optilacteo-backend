import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';

// Mock de uuid para evitar que Jest intente parsear la versión ESM en CommonJS
jest.mock('uuid', () => ({
  v4: () => 'mocked-uuid-v4',
}));

import { PasswordResetController } from '../password-reset.controller';
import { PasswordResetService } from '../password-reset.service';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

describe('PasswordResetController', () => {
  let controller: PasswordResetController;
  let service: jest.Mocked<PasswordResetService>;

  const mockPasswordResetService = {
    requestReset: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PasswordResetController],
      providers: [
        {
          provide: PasswordResetService,
          useValue: mockPasswordResetService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PasswordResetController>(PasswordResetController);
    service = module.get(PasswordResetService);
  });

  afterEach(() => jest.clearAllMocks());

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('requestReset', () => {
    it('debe llamar a passwordResetService.requestReset y retornar la respuesta del servicio', async () => {
      const dto: RequestPasswordResetDto = {
        email: 'usuario@ejemplo.com',
      };

      const expectedResponse = {
        message:
          'Si el email está registrado, recibirás un enlace de restablecimiento.',
      };

      mockPasswordResetService.requestReset.mockResolvedValue(expectedResponse);

      const result = await controller.requestReset(dto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.requestReset).toHaveBeenCalledWith(dto);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.requestReset).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResponse);
    });

    it('debe propagar las excepciones lanzadas por el servicio', async () => {
      const dto: RequestPasswordResetDto = {
        email: 'error@ejemplo.com',
      };

      mockPasswordResetService.requestReset.mockRejectedValue(
        new Error('Error interno del servicio'),
      );

      await expect(controller.requestReset(dto)).rejects.toThrow(
        'Error interno del servicio',
      );
    });
  });

  describe('resetPassword', () => {
    it('debe llamar a passwordResetService.resetPassword con el DTO adecuado', async () => {
      const dto: ResetPasswordDto = {
        token: 'uuid-valido-1234',
        newPassword: 'NuevaPassword123!',
        confirmPassword: 'NuevaPassword123!',
      };

      const expectedResponse = {
        message:
          'Tu contraseña fue restablecida correctamente. Ya podés iniciar sesión.',
      };

      mockPasswordResetService.resetPassword.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.resetPassword(dto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.resetPassword).toHaveBeenCalledWith(dto);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.resetPassword).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResponse);
    });

    it('debe propagar las excepciones lanzadas al intentar cambiar la contraseña', async () => {
      const dto: ResetPasswordDto = {
        token: 'token-expirado',
        newPassword: 'NuevaPassword123!',
        confirmPassword: 'NuevaPassword123!',
      };

      mockPasswordResetService.resetPassword.mockRejectedValue(
        new Error('El token es inválido o ha expirado'),
      );

      await expect(controller.resetPassword(dto)).rejects.toThrow(
        'El token es inválido o ha expirado',
      );
    });
  });
});
