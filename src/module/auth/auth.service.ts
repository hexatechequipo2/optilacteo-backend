import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import type { IUserRepository } from '../user/repository/user-repository.interface';
import { USER_REPOSITORY } from '../user/repository/user-repository.interface';
import { LoginDto } from './dto/login.dto';
import type { IRevokedTokenRepository } from './repository/revoked-token-repository.interface';
import { REVOKED_TOKEN_REPOSITORY } from './repository/revoked-token-repository.interface';
import type { JwtPayload } from './types/jwt-payload.type';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

export interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    email: string;
    role: string;
    empresa: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REVOKED_TOKEN_REPOSITORY)
    private readonly revokedTokenRepository: IRevokedTokenRepository,
    private readonly jwtService: JwtService,
  ) {}

  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      this.logger.warn(
        `Intento de login fallido: email no encontrado [${dto.email}]`,
      );
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    this.checkLockStatus(user.lockedUntil, dto.email);

    if (!user.isActive) {
      this.logger.warn(`Intento de login de usuario inactivo: [${dto.email}]`);
      throw new ForbiddenException(
        'El usuario esta inactivo. Contacte al administrador.',
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      await this.registerFailedAttempt(user.id, user.failedLoginAttempts, dto.email);
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.failedLoginAttempts > 0) {
      await this.userRepository.resetFailedAttempts(user.id);
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      empresaId: user.empresa?.id,
    };
    const access_token = await this.jwtService.signAsync(payload);

    this.logger.log(`Login exitoso para usuario [${dto.email}]`);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        empresa: user.empresa?.name ?? '',
      },
    };
  }

  private checkLockStatus(lockedUntil: Date | null, email: string): void {
    if (lockedUntil && lockedUntil > new Date()) {
      this.logger.warn(`Intento de login de cuenta bloqueada: [${email}]`);
      throw new ForbiddenException(
        'La cuenta esta temporalmente bloqueada por multiples intentos fallidos. Intente nuevamente mas tarde.',
      );
    }
  }

  private async registerFailedAttempt(
    userId: number,
    currentAttempts: number,
    email: string,
  ): Promise<void> {
    await this.userRepository.incrementFailedAttempts(userId);
    const updatedAttempts = currentAttempts + 1;

    this.logger.warn(
      `Intento de login fallido (${updatedAttempts}/${MAX_FAILED_ATTEMPTS}) para [${email}]`,
    );

    if (updatedAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCK_DURATION_MINUTES);
      await this.userRepository.lockUser(userId, lockedUntil);
      this.logger.warn(
        `Cuenta bloqueada por ${LOCK_DURATION_MINUTES} minutos para [${email}]`,
      );
    }
  }

  async logout(accessToken: string): Promise<{ message: string }> {
    try {
      const payload =
        await this.jwtService.verifyAsync<JwtPayload>(accessToken);
      const expiresAt = this.getTokenExpirationDate(payload);

      await this.revokedTokenRepository.createRevokedToken({
        tokenHash: AuthService.hashToken(accessToken),
        userId: payload.sub,
        empresaId: payload.empresaId,
        expiresAt,
      });

      this.logger.log(`Logout exitoso para usuario [${payload.email}]`);
      return { message: 'Sesion cerrada correctamente' };
    } catch (error) {
      if (this.isDuplicateTokenError(error)) {
        return { message: 'Sesion cerrada correctamente' };
      }

      throw new UnauthorizedException('Token de autenticacion invalido');
    }
  }

  private getTokenExpirationDate(payload: JwtPayload): Date {
    if (!payload.exp) {
      throw new UnauthorizedException('Token de autenticacion invalido');
    }

    return new Date(payload.exp * 1000);
  }

  private isDuplicateTokenError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }
}
