import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { IRevokedTokenRepository } from '../repository/revoked-token-repository.interface';
import { REVOKED_TOKEN_REPOSITORY } from '../repository/revoked-token-repository.interface';
import type { JwtPayload } from '../types/jwt-payload.type';
import { AuthService } from '../auth.service';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  accessToken?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    @Inject(REVOKED_TOKEN_REPOSITORY)
    private readonly revokedTokenRepository: IRevokedTokenRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticación requerido');
    }

    const tokenHash = AuthService.hashToken(token);
    const isRevoked = await this.revokedTokenRepository.existsActiveByTokenHash(
      tokenHash,
      new Date(),
    );

    if (isRevoked) {
      throw new UnauthorizedException('Token de sesión inválido');
    }

    try {
      request.user = await this.jwtService.verifyAsync<JwtPayload>(token);
      request.accessToken = token;
    } catch {
      throw new UnauthorizedException('Token de autenticación inválido');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
