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
    private readonly mailService: MailService,
  ) {}

  async requestReset(dto: RequestPasswordResetDto): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      this.logger.warn(`Solicitud de reset para email no registrado: ${dto.email}`);
      return { message: 'Si el email está registrado, recibirás un enlace de restablecimiento.' };
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

    await this.mailService.sendPasswordResetEmail(user.email, token);

    this.logger.log(`Token de reset generado para usuario ${user.id}`);
    return { message: 'Si el email está registrado, recibirás un enlace de restablecimiento.' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const tokenEntity = await this.tokenRepository.findByToken(dto.token);

    if (!tokenEntity || tokenEntity.used) {
      throw new BadRequestException('El enlace de restablecimiento no es válido o ya fue utilizado');
    }

    const now = new Date();
    if (now > tokenEntity.expiresAt) {
      throw new BadRequestException('El enlace de restablecimiento ha expirado. Solicitá uno nuevo.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.updatePassword(tokenEntity.userId, passwordHash);

    await this.tokenRepository.markAsUsed(tokenEntity.id);

    this.logger.log(`Contraseña restablecida para usuario ${tokenEntity.userId}`);

    return { message: 'Tu contraseña fue restablecida correctamente. Ya podés iniciar sesión.' };
  }
}