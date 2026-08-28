import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.MAIL_FROM;
    const senderName = process.env.MAIL_FROM_NAME ?? 'Optilacteo';

    if (!apiKey || !senderEmail) {
      this.logger.error(
        'Faltan BREVO_API_KEY o MAIL_FROM en las variables de entorno',
      );
      throw new Error('Configuración de mail incompleta');
    }

    // FRONTEND_URL puede traer varios origenes separados por coma (ver
    // main.ts); para un link de email se usa el primero como canonico.
    const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
      .split(',')[0]
      .trim();
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: to }],
        subject: 'Restablecimiento de contraseña - Optilacteo',
        htmlContent: `
          <p>Hola,</p>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <p><a href="${resetUrl}">Hacé clic aquí para restablecer tu contraseña</a></p>
          <p>Este enlace expira en 30 minutos. Si no solicitaste esto, podés ignorar este correo.</p>
        `,
      }),
    });

    if (!response.ok) {
      const detalle = await response.text();
      this.logger.error(
        `Error al enviar email a ${to}: ${response.status} ${detalle}`,
      );
      throw new Error('No se pudo enviar el email de restablecimiento');
    }

    this.logger.log(`Email de restablecimiento enviado a ${to}`);
  }
}
