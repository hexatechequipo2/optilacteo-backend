import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    // FRONTEND_URL puede traer varios origenes separados por coma (ver
    // main.ts); para un link de email se usa el primero como canonico.
    const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
      .split(',')[0]
      .trim();
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: `"Optilacteo" <${process.env.SMTP_USER}>`,
        to,
        subject: 'Restablecimiento de contraseña - Optilacteo',
        html: `
          <p>Hola,</p>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <p><a href="${resetUrl}">Hacé clic aquí para restablecer tu contraseña</a></p>
          <p>Este enlace expira en 30 minutos. Si no solicitaste esto, podés ignorar este correo.</p>
        `,
      });
      this.logger.log(`Email de restablecimiento enviado a ${to}`);
    } catch (error) {
      this.logger.error(`Error al enviar email a ${to}`, error);
      throw error;
    }
  }
}