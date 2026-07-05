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
import { ROLES, type RolNombre } from '../rol/constants/roles.constants';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

export interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    email: string;
    rolId: number | null;
    rolNombre: string | null;
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
      this.logger.warn(`Login fallido (no existe): [${dto.email}]`);
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    this.checkLockStatus(user.lockedUntil, dto.email);

    if (!user.isActive) {
      this.logger.warn(`Login usuario inactivo: [${dto.email}]`);
      throw new ForbiddenException(
        'El usuario está inactivo. Contacte al administrador.',
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);

    if (!passwordValid) {
      await this.registerFailedAttempt(
        user.id,
        user.failedLoginAttempts,
        dto.email,
      );
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.failedLoginAttempts > 0) {
      await this.userRepository.resetFailedAttempts(user.id);
    }

    // Validación segura de rol
    const rolNombre: RolNombre | null =
      user.rol?.nombre && Object.values(ROLES).includes(user.rol.nombre as RolNombre)
        ? (user.rol.nombre as RolNombre)
        : null;

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      rolId: user.rol?.id ?? null,
      rolNombre,
      permisos:
        user.rol?.permisos?.map((p) => ({
          modulo: p.modulo,
          canRead: p.canRead,
          canWrite: p.canWrite,
        })) ?? [],
      empresaId: user.empresa?.id ?? null,
      jti: '',
    };

    const access_token = await this.jwtService.signAsync(payload);

    this.logger.log(`Login exitoso: [${dto.email}]`);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        rolId: user.rol?.id ?? null,
        rolNombre,
        empresa: user.empresa?.name ?? '',
      },
    };
  }

  private checkLockStatus(lockedUntil: Date | null, email: string): void {
    if (lockedUntil && lockedUntil > new Date()) {
      this.logger.warn(`Cuenta bloqueada: [${email}]`);
      throw new ForbiddenException('La cuenta está bloqueada temporalmente.');
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
      `Login fallido (${updatedAttempts}/${MAX_FAILED_ATTEMPTS}) [${email}]`,
    );

    if (updatedAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date();
      lockedUntil.setMinutes(
        lockedUntil.getMinutes() + LOCK_DURATION_MINUTES,
      );

      await this.userRepository.lockUser(userId, lockedUntil);

      this.logger.warn(`Usuario bloqueado: [${email}]`);
    }
  }

  async logout(accessToken: string): Promise<{ message: string }> {
    try {
      const payload = await this.jwtService.verifyAsync(accessToken);

      const expiresAt = this.getTokenExpirationDate(payload);

      await this.revokedTokenRepository.createRevokedToken({
        tokenHash: AuthService.hashToken(accessToken),
        userId: payload.sub,
        empresaId: payload.empresaId,
        expiresAt,
      });

      this.logger.log(`Logout: [${payload.email}]`);

      return { message: 'Sesión cerrada correctamente' };
    } catch (error) {
      if (this.isDuplicateTokenError(error)) {
        return { message: 'Sesión cerrada correctamente' };
      }
      throw new UnauthorizedException('Token inválido');
    }
  }

  private getTokenExpirationDate(payload: JwtPayload): Date {
    if (!payload.exp) {
      throw new UnauthorizedException('Token inválido');
    }
    return new Date(payload.exp * 1000);
  }

  private isDuplicateTokenError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as any).code === '23505'
    );
  }
}