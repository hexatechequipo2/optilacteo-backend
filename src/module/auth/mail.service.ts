import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/auth/reset-password?token=${token}`;

    this.logger.log(`[RESET PASSWORD] Enlace de restablecimiento enviado a ${to}: ${resetUrl}`);

  }
}