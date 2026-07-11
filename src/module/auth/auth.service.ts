import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

import type { IUserRepository } from '../user/repository/user-repository.interface';
import { USER_REPOSITORY } from '../user/repository/user-repository.interface';
import { User } from '../user/entities/user.entity';

import { LoginDto } from './dto/login.dto';
import type { IRevokedTokenRepository } from './repository/revoked-token-repository.interface';
import { REVOKED_TOKEN_REPOSITORY } from './repository/revoked-token-repository.interface';
import type { IRefreshTokenRepository } from './repository/refresh-token-repository.interface';
import { REFRESH_TOKEN_REPOSITORY } from './repository/refresh-token-repository.interface';

import type { JwtPayload } from './types/jwt-payload.type';
import { ROLES, type RolNombre } from '../rol/constants/roles.constants';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const REFRESH_TOKEN_BYTES = 64;
const DEFAULT_REFRESH_TOKEN_EXPIRES_DAYS = 7;
const DEFAULT_REFRESH_TOKEN_EXPIRES_DAYS_REMEMBER_ME = 30;

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    email: string;
    rolId: number | null;
    rolNombre: string | null;
    empresa: string;
    empresaId: number | null;
  };
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,

    @Inject(REVOKED_TOKEN_REPOSITORY)
    private readonly revokedTokenRepository: IRevokedTokenRepository,

    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
      // Antes: ForbiddenException (403). Se cambia a 401 porque el
      // AllExceptionsFilter enmascara todo 403 como 404 "Recurso no
      // encontrado" (anti information-disclosure para recursos), lo cual
      // pisaba este mensaje especifico y evitaba que el usuario supiera
      // que su cuenta esta inactiva.
      throw new UnauthorizedException(
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

    const payload = this.buildJwtPayload(user);
    const access_token = await this.jwtService.signAsync(payload);

    const familyId = randomUUID();
    const expiresAt = this.buildRefreshTokenExpiration(dto.rememberMe ?? false);
    const refresh_token = await this.issueRefreshToken({
      userId: user.id,
      empresaId: payload.empresaId,
      familyId,
      expiresAt,
    });

    this.logger.log(`Login exitoso: [${dto.email}]`);

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        rolId: payload.rolId,
        rolNombre: payload.rolNombre,
        empresa: user.empresa?.name ?? '',
        empresaId: payload.empresaId,
      },
    };
  }

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const tokenHash = AuthService.hashToken(refreshToken);
    const existing = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!existing) {
      this.logger.warn('Refresh con token inexistente');
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (existing.revokedAt) {
      // El token ya fue rotado antes: esta presentación es un reuso,
      // posible robo. Se corta toda la sesión (familia) como contención.
      await this.refreshTokenRepository.revokeFamily(existing.familyId);
      this.logger.warn(
        `Reuso de refresh token detectado, sesión revocada [userId=${existing.userId}]`,
      );
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (existing.expiresAt <= new Date()) {
      this.logger.warn(`Refresh token expirado [userId=${existing.userId}]`);
      throw new UnauthorizedException('Refresh token inválido');
    }

    const user = await this.userRepository.findById(existing.userId);

    if (!user || !user.isActive) {
      this.logger.warn(
        `Refresh con usuario inexistente o inactivo [userId=${existing.userId}]`,
      );
      throw new UnauthorizedException('Refresh token inválido');
    }

    const payload = this.buildJwtPayload(user);
    const access_token = await this.jwtService.signAsync(payload);

    // Límite absoluto de sesión: se copia el mismo expiresAt del token
    // original en vez de extenderlo en cada rotación.
    const newRefreshToken = await this.issueRefreshToken({
      userId: existing.userId,
      empresaId: existing.empresaId,
      familyId: existing.familyId,
      expiresAt: existing.expiresAt,
    });

    await this.refreshTokenRepository.revokeById(
      existing.id,
      AuthService.hashToken(newRefreshToken),
    );

    return { access_token, refresh_token: newRefreshToken };
  }

  private buildJwtPayload(user: User): JwtPayload {
    const rolNombre: RolNombre | null =
      user.rol?.nombre && Object.values(ROLES).includes(user.rol.nombre as RolNombre)
        ? (user.rol.nombre as RolNombre)
        : null;

    return {
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
  }

  private buildRefreshTokenExpiration(rememberMe: boolean): Date {
    const days = rememberMe
      ? this.configService.get<number>('REFRESH_TOKEN_EXPIRES_DAYS_REMEMBER_ME') ??
        DEFAULT_REFRESH_TOKEN_EXPIRES_DAYS_REMEMBER_ME
      : this.configService.get<number>('REFRESH_TOKEN_EXPIRES_DAYS') ??
        DEFAULT_REFRESH_TOKEN_EXPIRES_DAYS;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(days));
    return expiresAt;
  }

  private async issueRefreshToken(params: {
    userId: number;
    empresaId: number | null;
    familyId: string;
    expiresAt: Date;
  }): Promise<string> {
    const plainToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');

    await this.refreshTokenRepository.create({
      tokenHash: AuthService.hashToken(plainToken),
      userId: params.userId,
      empresaId: params.empresaId,
      familyId: params.familyId,
      expiresAt: params.expiresAt,
    });

    return plainToken;
  }

  private checkLockStatus(lockedUntil: Date | null, email: string): void {
    if (lockedUntil && lockedUntil > new Date()) {
      this.logger.warn(`Cuenta bloqueada: [${email}]`);
      // Antes: ForbiddenException (403). Ver comentario en login() sobre
      // por que se cambia a 401 (evita el masking 403->404 del filter global).
      throw new UnauthorizedException(
        'La cuenta está bloqueada temporalmente.',
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

  async logout(
    accessToken: string,
    refreshToken?: string,
  ): Promise<{ message: string }> {
    // Paso 1: verificar el JWT de forma aislada. Si falla aca, es un
    // problema del cliente (token invalido/expirado) -> 401, con warn.
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync(accessToken);
    } catch (error) {
      this.logger.warn(
        `Logout con token invalido: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new UnauthorizedException('Token inválido');
    }

    // Paso 2: efectos de logout (DB, revocacion). Si algo falla aca, NO es
    // culpa del token: es un fallo interno (DB caida, etc) -> debe
    // propagarse como 500, con log completo, en vez de disfrazarse de 401.
    try {
      const expiresAt = this.getTokenExpirationDate(payload);

      await this.revokedTokenRepository.createRevokedToken({
        tokenHash: AuthService.hashToken(accessToken),
        userId: payload.sub,
        empresaId: payload.empresaId,
        expiresAt,
      });

      if (refreshToken) {
        await this.revokeRefreshTokenFamily(refreshToken);
      }

      this.logger.log(`Logout: [${payload.email}]`);

      return { message: 'Sesión cerrada correctamente' };
    } catch (error) {
      if (this.isDuplicateTokenError(error)) {
        return { message: 'Sesión cerrada correctamente' };
      }

      this.logger.error(
        `Error inesperado en logout [userId=${payload.sub}]`,
        error instanceof Error ? error.stack : String(error),
      );
      // Se re-lanza tal cual: el AllExceptionsFilter lo trata como 500
      // y loguea el stack, en vez de mentirle al cliente con "Token inválido".
      throw error;
    }
  }

  private async revokeRefreshTokenFamily(refreshToken: string): Promise<void> {
    const tokenHash = AuthService.hashToken(refreshToken);
    const existing = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (existing) {
      await this.refreshTokenRepository.revokeFamily(existing.familyId);
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