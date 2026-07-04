import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedRequest } from '../../module/auth/guards/jwt-auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no hay @Roles(), permite el acceso
    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user?.rolNombre) {
      throw new ForbiddenException('El usuario no posee un rol asignado.');
    }

    if (!requiredRoles.includes(request.user.rolNombre)) {
      throw new ForbiddenException(
        'No tiene permisos para acceder a este recurso.',
      );
    }

    return true;
  }
}