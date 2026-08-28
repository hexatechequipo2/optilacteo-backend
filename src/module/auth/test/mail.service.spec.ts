import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from '../mail.service';

describe('MailService', () => {
  let service: MailService;
  const fetchMock = jest.fn();
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  // Devuelve el body parseado de la n-esima llamada a fetch.
  const bodyDeLlamada = (indice = 0) =>
    JSON.parse(fetchMock.mock.calls[indice][1].body);

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    global.fetch = fetchMock as unknown as typeof fetch;

    // Config valida por defecto; cada test la sobreescribe si lo necesita.
    process.env.BREVO_API_KEY = 'xkeysib-test';
    process.env.MAIL_FROM = 'soporte@optilacteo.com';
    process.env.MAIL_FROM_NAME = 'Optilacteo';

    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('sendPasswordResetEmail', () => {
    it('debe enviar el correo correctamente con el token y URL base', async () => {
      process.env.FRONTEND_URL = 'https://app.optilacteo.com';
      fetchMock.mockResolvedValueOnce({ ok: true, status: 201 });

      await service.sendPasswordResetEmail('usuario@ejemplo.com', 'token123');

      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, opciones] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.brevo.com/v3/smtp/email');
      expect(opciones.method).toBe('POST');
      expect(opciones.headers['api-key']).toBe('xkeysib-test');

      const body = bodyDeLlamada();
      expect(body.sender).toEqual({
        email: 'soporte@optilacteo.com',
        name: 'Optilacteo',
      });
      expect(body.to).toEqual([{ email: 'usuario@ejemplo.com' }]);
      expect(body.subject).toBe('Restablecimiento de contraseña - Optilacteo');
      expect(body.htmlContent).toContain(
        'https://app.optilacteo.com/auth/reset-password?token=token123',
      );
    });

    it('debe usar el primer origen si FRONTEND_URL contiene múltiples URLs separadas por coma', async () => {
      process.env.FRONTEND_URL =
        'https://app.optilacteo.com , https://admin.optilacteo.com';
      fetchMock.mockResolvedValueOnce({ ok: true, status: 201 });

      await service.sendPasswordResetEmail('usuario@ejemplo.com', 'tokenABC');

      expect(bodyDeLlamada().htmlContent).toContain(
        'https://app.optilacteo.com/auth/reset-password?token=tokenABC',
      );
    });

    it('debe usar el fallback http://localhost:5173 si FRONTEND_URL no está definido', async () => {
      delete process.env.FRONTEND_URL;
      fetchMock.mockResolvedValueOnce({ ok: true, status: 201 });

      await service.sendPasswordResetEmail('usuario@ejemplo.com', 'tokenXYZ');

      expect(bodyDeLlamada().htmlContent).toContain(
        'http://localhost:5173/auth/reset-password?token=tokenXYZ',
      );
    });

    it('debe lanzar error si la API de Brevo responde con un status de error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('{"message":"Key not found"}'),
      });

      await expect(
        service.sendPasswordResetEmail('usuario@ejemplo.com', 'token123'),
      ).rejects.toThrow('No se pudo enviar el email de restablecimiento');
    });

    it('debe lanzar error y no llamar a la API si falta BREVO_API_KEY', async () => {
      delete process.env.BREVO_API_KEY;

      await expect(
        service.sendPasswordResetEmail('usuario@ejemplo.com', 'token123'),
      ).rejects.toThrow('Configuración de mail incompleta');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('debe lanzar error y no llamar a la API si falta MAIL_FROM', async () => {
      delete process.env.MAIL_FROM;

      await expect(
        service.sendPasswordResetEmail('usuario@ejemplo.com', 'token123'),
      ).rejects.toThrow('Configuración de mail incompleta');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
