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

    // Mensaje generico para no revelar que campo fallo (email o contrasena).
    if (!user) {
      this.logger.warn(
        `Intento de login fallido: email no encontrado [${dto.email}]`,
      );
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      this.logger.warn(
        `Intento de login fallido: contrasena incorrecta para [${dto.email}]`,
      );
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (!user.isActive) {
      this.logger.warn(`Intento de login de usuario inactivo: [${dto.email}]`);
      throw new ForbiddenException(
        'El usuario esta inactivo. Contacte al administrador.',
      );
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
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

  async logout(accessToken: string): Promise<{ message: string }> {
    try {
      const payload =
        await this.jwtService.verifyAsync<JwtPayload>(accessToken);
      const expiresAt = this.getTokenExpirationDate(payload);

      await this.revokedTokenRepository.createRevokedToken({
        tokenHash: AuthService.hashToken(accessToken),
        userId: payload.sub,
        tenantId: payload.tenant_id,
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
