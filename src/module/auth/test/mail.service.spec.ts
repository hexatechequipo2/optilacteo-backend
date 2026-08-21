import { Test, TestingModule } from '@nestjs/testing';
import * as nodemailer from 'nodemailer';
import { MailService } from '../mail.service';

jest.mock('nodemailer');

describe('MailService', () => {
  let service: MailService;
  const sendMailMock = jest.fn();

  const originalEnv = process.env;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('sendPasswordResetEmail', () => {
    it('debe enviar el correo correctamente con el token y URL base', async () => {
      process.env.SMTP_USER = 'soporte@optilacteo.com';
      process.env.FRONTEND_URL = 'https://app.optilacteo.com';

      sendMailMock.mockResolvedValueOnce({ messageId: '123' });

      await service.sendPasswordResetEmail('usuario@ejemplo.com', 'token123');

      expect(sendMailMock).toHaveBeenCalledWith({
        from: '"Optilacteo" <soporte@optilacteo.com>',
        to: 'usuario@ejemplo.com',
        subject: 'Restablecimiento de contraseña - Optilacteo',
        html: expect.stringContaining(
          'https://app.optilacteo.com/auth/reset-password?token=token123',
        ),
      });
    });

    it('debe usar el primer origen si FRONTEND_URL contiene múltiples URLs separadas por coma', async () => {
      process.env.SMTP_USER = 'soporte@optilacteo.com';
      process.env.FRONTEND_URL =
        'https://app.optilacteo.com , https://admin.optilacteo.com';

      sendMailMock.mockResolvedValueOnce({ messageId: '123' });

      await service.sendPasswordResetEmail('usuario@ejemplo.com', 'tokenABC');

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(
            'https://app.optilacteo.com/auth/reset-password?token=tokenABC',
          ),
        }),
      );
    });

    it('debe usar el fallback http://localhost:5173 si FRONTEND_URL no está definido', async () => {
      delete process.env.FRONTEND_URL;
      process.env.SMTP_USER = 'soporte@optilacteo.com';

      sendMailMock.mockResolvedValueOnce({ messageId: '123' });

      await service.sendPasswordResetEmail('usuario@ejemplo.com', 'tokenXYZ');

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(
            'http://localhost:5173/auth/reset-password?token=tokenXYZ',
          ),
        }),
      );
    });

    it('debe relanzar el error si sendMail falla', async () => {
      sendMailMock.mockRejectedValueOnce(new Error('SMTP Error'));

      await expect(
        service.sendPasswordResetEmail('usuario@ejemplo.com', 'token123'),
      ).rejects.toThrow('SMTP Error');
    });
  });
});