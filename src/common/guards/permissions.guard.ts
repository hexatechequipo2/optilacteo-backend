import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<{ modulo: string | string[]; action: 'canRead' | 'canWrite' }>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.permisos || !Array.isArray(user.permisos)) {
      throw new ForbiddenException('El usuario no tiene permisos asignados.');
    }

    // Normalizar a array
    const requiredModulos = Array.isArray(required.modulo)
      ? required.modulo
      : [required.modulo];

    // Validar que tenga permiso en al menos uno de los módulos
    const tienePermiso = requiredModulos.some(mod =>
      user.permisos.find((p: any) => p.modulo === mod && p[required.action] === true),
    );

    if (!tienePermiso) {
      throw new ForbiddenException(
        `El rol ${user.rolNombre} no tiene permiso ${required.action} en ninguno de los módulos: ${requiredModulos.join(', ')}.`,
      );
    }

    return true;
  }
}
