import { Test, TestingModule } from '@nestjs/testing';
import { PasswordResetService } from '../password-reset.service';
import { MailService } from '../mail.service';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from '../repository/password-reset-token.interface';
import { USER_REPOSITORY } from '../../user/repository/user-repository.interface';
import { REFRESH_TOKEN_REPOSITORY } from '../repository/refresh-token-repository.interface';
import { BadRequestException } from '@nestjs/common';

// 👇 Mock explícito de uuid y bcrypt
jest.mock('uuid', () => ({ v4: jest.fn(() => 'fake-uuid') }));
jest.mock('bcrypt', () => ({ hash: jest.fn(() => 'hashed-pass') }));

describe('PasswordResetService', () => {
  let service: PasswordResetService;

  const tokenRepoMock = {
    deleteByUserId: jest.fn(),
    save: jest.fn(),
    findByToken: jest.fn(),
    markAsUsed: jest.fn(),
  };

  const userRepoMock = {
    findByEmail: jest.fn(),
    updatePassword: jest.fn(),
  };

  const refreshTokenRepoMock = {
    revokeAllByUserId: jest.fn(),
  };

  const mailServiceMock = {
    sendPasswordResetEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: PASSWORD_RESET_TOKEN_REPOSITORY, useValue: tokenRepoMock },
        { provide: USER_REPOSITORY, useValue: userRepoMock },
        { provide: REFRESH_TOKEN_REPOSITORY, useValue: refreshTokenRepoMock },
        { provide: MailService, useValue: mailServiceMock },
      ],
    }).compile();

    service = module.get(PasswordResetService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestReset', () => {
    it('cuando el email no está registrado, devuelve mensaje genérico', async () => {
      userRepoMock.findByEmail.mockResolvedValue(null);

      const result = await service.requestReset({ email: 'no@existe.com' });

      expect(result.message).toContain('Si el email está registrado');
      expect(tokenRepoMock.deleteByUserId).not.toHaveBeenCalled();
      expect(mailServiceMock.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('cuando el email está registrado, guarda token y envía email', async () => {
      userRepoMock.findByEmail.mockResolvedValue({
        id: 1,
        email: 'test@ok.com',
      });

      const result = await service.requestReset({ email: 'test@ok.com' });

      expect(tokenRepoMock.deleteByUserId).toHaveBeenCalledWith('1');
      expect(tokenRepoMock.save).toHaveBeenCalled();
      expect(mailServiceMock.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@ok.com',
        'fake-uuid',
      );
      expect(result.message).toContain('Si el email está registrado');
    });
  });

  describe('resetPassword', () => {
    it('lanza BadRequestException si las contraseñas no coinciden', async () => {
      await expect(
        service.resetPassword({
          token: 'abc',
          newPassword: '123',
          confirmPassword: '456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el token no existe', async () => {
      tokenRepoMock.findByToken.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: 'abc',
          newPassword: '123',
          confirmPassword: '123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el token ya fue usado', async () => {
      tokenRepoMock.findByToken.mockResolvedValue({
        used: true,
        expiresAt: new Date(Date.now() + 10000),
      });

      await expect(
        service.resetPassword({
          token: 'abc',
          newPassword: '123',
          confirmPassword: '123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el token está expirado', async () => {
      tokenRepoMock.findByToken.mockResolvedValue({
        used: false,
        expiresAt: new Date(Date.now() - 10000),
      });

      await expect(
        service.resetPassword({
          token: 'abc',
          newPassword: '123',
          confirmPassword: '123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('actualiza contraseña y revoca refresh tokens si todo es válido', async () => {
      tokenRepoMock.findByToken.mockResolvedValue({
        id: 1,
        userId: '1',
        used: false,
        expiresAt: new Date(Date.now() + 10000),
      });

      userRepoMock.updatePassword.mockResolvedValue(true);
      tokenRepoMock.markAsUsed.mockResolvedValue(true);
      refreshTokenRepoMock.revokeAllByUserId.mockResolvedValue(true);

      const result = await service.resetPassword({
        token: 'abc',
        newPassword: '123',
        confirmPassword: '123',
      });

      expect(userRepoMock.updatePassword).toHaveBeenCalledWith(
        '1',
        'hashed-pass',
      );
      expect(tokenRepoMock.markAsUsed).toHaveBeenCalledWith(1);
      expect(refreshTokenRepoMock.revokeAllByUserId).toHaveBeenCalledWith(1);
      expect(result.message).toContain('Tu contraseña fue restablecida');
    });
  });
});
