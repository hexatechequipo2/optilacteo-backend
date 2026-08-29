import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import {
  type IPasswordResetTokenRepository,
  PASSWORD_RESET_TOKEN_REPOSITORY,
} from './repository/password-reset-token.interface';
import { USER_REPOSITORY } from '../user/repository/user-repository.interface';
import type { IUserRepository } from '../user/repository/user-repository.interface';
import type { IRefreshTokenRepository } from './repository/refresh-token-repository.interface';
import { REFRESH_TOKEN_REPOSITORY } from './repository/refresh-token-repository.interface';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from './mail.service';

const TOKEN_EXPIRATION_MINUTES = 30;

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly tokenRepository: IPasswordResetTokenRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly mailService: MailService,
  ) {}

  async requestReset(
    dto: RequestPasswordResetDto,
  ): Promise<{ message: string }> {
    // Mensaje único para ambos casos (usuario existe / no existe). No se
    // debe devolver ninguna señal distinguible al cliente (ni mensaje, ni
    // status code distinto), o se habilita enumeración de cuentas
    // (MITRE ATT&CK T1589.002 - Gather Victim Identity Information).
    const genericMessage =
      'Si el email está registrado, recibirás un enlace de restablecimiento.';

    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      this.logger.warn(
        `Solicitud de reset para email no registrado: ${dto.email}`,
      );
      return { message: genericMessage };
    }

    await this.tokenRepository.deleteByUserId(user.id.toString());

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + TOKEN_EXPIRATION_MINUTES);

    const token = uuidv4();
    await this.tokenRepository.save({
      token,
      userId: user.id.toString(),
      tenant_id: user.empresa?.id.toString() ?? null,
      expiresAt,
      used: false,
    });

    try {
      await this.mailService.sendPasswordResetEmail(user.email, token);
      this.logger.log(
        `Token de reset generado y enviado para usuario ${user.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Fallo al enviar email de reset para usuario ${user.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return { message: genericMessage };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const tokenEntity = await this.tokenRepository.findByToken(dto.token);

    if (!tokenEntity || tokenEntity.used) {
      throw new BadRequestException(
        'El enlace de restablecimiento no es válido o ya fue utilizado',
      );
    }

    const now = new Date();
    if (now > tokenEntity.expiresAt) {
      throw new BadRequestException(
        'El enlace de restablecimiento ha expirado. Solicitá uno nuevo.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.updatePassword(tokenEntity.userId, passwordHash);
    await this.tokenRepository.markAsUsed(tokenEntity.id);

    // Corta toda sesión activa del usuario (todas las familias de refresh
    // token, no solo una). Sin esto, un atacante con la cuenta comprometida
    // conserva acceso vía su refresh_token vigente (hasta 7-30 días) aunque
    // la víctima "recupere" la cuenta cambiando la contraseña
    // (MITRE ATT&CK T1098 - Account Manipulation, como mecanismo de
    // persistencia post-recuperación).
    await this.refreshTokenRepository.revokeAllByUserId(
      Number(tokenEntity.userId),
    );

    this.logger.log(
      `Contraseña restablecida para usuario ${tokenEntity.userId}`,
    );

    return {
      message:
        'Tu contraseña fue restablecida correctamente. Ya podés iniciar sesión.',
    };
  }
}
