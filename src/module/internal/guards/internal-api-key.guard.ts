import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

// Autenticación servicio-a-servicio para el microservicio ML: no hay usuario
// ni JWT de por medio, solo una API key compartida vía header. Se usa junto
// con @Public() en el controller para saltar el JwtAuthGuard global (ver
// auth.module.ts), que de otro modo rechazaría estas requests antes de
// llegar acá.
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedKey = this.configService.get<string>(
      'NEST_INTERNAL_API_KEY',
    );

    if (!expectedKey) {
      throw new UnauthorizedException(
        'NEST_INTERNAL_API_KEY no está configurada en el servidor',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers['x-internal-api-key'];

    if (providedKey !== expectedKey) {
      throw new UnauthorizedException('API key interna inválida');
    }

    return true;
  }
}
