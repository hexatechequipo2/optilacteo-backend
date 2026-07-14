import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

// Mock a nivel de modulo para evitar el problema de ESModules de uuid (v9+).
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-token'),
}));

import { PasswordResetService } from '../password-reset.service';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from '../repository/password-reset-token.interface';
import { USER_REPOSITORY } from '../../user/repository/user-repository.interface';
import { MailService } from '../mail.service';

const mockTokenRepository = {
  save:           jest.fn(),
  findByToken:    jest.fn(),
  markAsUsed:     jest.fn(),
  deleteByUserId: jest.fn(),
};

const mockUserRepository = {
  findByEmail:    jest.fn(),
  updatePassword: jest.fn(),
};

const mockMailService = {
  sendPasswordResetEmail: jest.fn(),
};

describe('PasswordResetService — restablecimiento de contraseña por email', () => {
  let service: PasswordResetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: PASSWORD_RESET_TOKEN_REPOSITORY, useValue: mockTokenRepository },
        { provide: USER_REPOSITORY,                 useValue: mockUserRepository },
        { provide: MailService,                     useValue: mockMailService },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('requestReset', () => {
    it('criterio #1: cuando el email está registrado, debe enviar el email con enlace de restablecimiento', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({
        id:        'usuario-uuid-1',
        email:     'operario@lacteo.com',
        tenant_id: 'empresa-uuid-1',
      });
      mockTokenRepository.deleteByUserId.mockResolvedValue(undefined);
      mockTokenRepository.save.mockResolvedValue({});
      mockMailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const resultado = await service.requestReset({ email: 'operario@lacteo.com' });

      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'operario@lacteo.com',
        expect.any(String),
      );
      expect(resultado.message).toBeDefined();
    });

    // CP-07
    // Validar que la solicitud de restablecimiento con email no registrado
    // sea rechazada con un BadRequestException.
    it('criterio #1: cuando el email NO está registrado, debe lanzar BadRequestException', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.requestReset({
          email: 'noexiste@lacteo.com',
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'No existe una cuenta registrada con ese correo',
        ),
      );

      expect(
        mockMailService.sendPasswordResetEmail,
      ).not.toHaveBeenCalled();
    });

    //CP-06
    // Validar que el enlace de restablecimiento es de un solo uso.

    it('criterio #2 y #3: el token generado debe tener fecha de expiración a 30 minutos y estar marcado como no usado', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({
        id:        'usuario-uuid-1',
        email:     'operario@lacteo.com',
        tenant_id: 'empresa-uuid-1',
      });
      mockTokenRepository.deleteByUserId.mockResolvedValue(undefined);
      mockTokenRepository.save.mockResolvedValue({});
      mockMailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const ahoraMasOMenos = new Date();

      await service.requestReset({ email: 'operario@lacteo.com' });

      const tokenGuardado = mockTokenRepository.save.mock.calls[0][0];
      expect(tokenGuardado.used).toBe(false);
      const diferenciaMinutos =
        (tokenGuardado.expiresAt.getTime() - ahoraMasOMenos.getTime()) / 60000;
      expect(diferenciaMinutos).toBeCloseTo(30, 0);
    });
  });

  //CP-04 
  // Validar el flujo completo de restablecimiento de contraseña por email.
  describe('resetPassword', () => {
    it('criterio #4 y #5: cuando el token es válido y las contraseñas coinciden, debe actualizar la contraseña y confirmar el cambio', async () => {
      const futuro = new Date(Date.now() + 10 * 60 * 1000);
      mockTokenRepository.findByToken.mockResolvedValue({
        id:        'token-uuid-1',
        token:     'valid-token-uuid',
        userId:    'usuario-uuid-1',
        expiresAt: futuro,
        used:      false,
      });
      mockUserRepository.updatePassword.mockResolvedValue(undefined);
      mockTokenRepository.markAsUsed.mockResolvedValue(undefined);

      const resultado = await service.resetPassword({
        token:           'valid-token-uuid',
        newPassword:     'NuevaPassword123!',
        confirmPassword: 'NuevaPassword123!',
      });

      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(
        'usuario-uuid-1',
        expect.any(String), 
      );
      expect(mockTokenRepository.markAsUsed).toHaveBeenCalledWith('token-uuid-1');
      expect(resultado.message).toContain('restablecida correctamente');
    });

    it('criterio #4: cuando las contraseñas no coinciden, debe lanzar BadRequestException', async () => {
      await expect(
        service.resetPassword({
          token:           'valid-token-uuid',
          newPassword:     'Password123!',
          confirmPassword: 'PasswordDiferente!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    //CP-06
    // Validar que el enlace de restablecimiento es de un solo uso.

    it('criterio #3: cuando el token ya fue utilizado, debe lanzar BadRequestException', async () => {
      mockTokenRepository.findByToken.mockResolvedValue({
        id:        'token-uuid-1',
        token:     'used-token-uuid',
        userId:    'usuario-uuid-1',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        used:      true,
      });

      await expect(
        service.resetPassword({
          token:           'used-token-uuid',
          newPassword:     'NuevaPassword123!',
          confirmPassword: 'NuevaPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    
  //CP-05 
  // Validar el rechazo de enlace de restablecimiento vencido.
    it('criterio #2: cuando el token ha expirado, debe lanzar BadRequestException', async () => {
      const pasado = new Date(Date.now() - 31 * 60 * 1000); 
      mockTokenRepository.findByToken.mockResolvedValue({
        id:        'token-uuid-1',
        token:     'expired-token-uuid',
        userId:    'usuario-uuid-1',
        expiresAt: pasado,
        used:      false,
      });

      await expect(
        service.resetPassword({
          token:           'expired-token-uuid',
          newPassword:     'NuevaPassword123!',
          confirmPassword: 'NuevaPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('cuando el token no existe en la base de datos, debe lanzar BadRequestException', async () => {
      mockTokenRepository.findByToken.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token:           'token-inexistente',
          newPassword:     'NuevaPassword123!',
          confirmPassword: 'NuevaPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});