// common/guards/permissions.guard.ts
import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../module/auth/decorators/public.decorator';
import {
  AUTHENTICATED_ONLY_KEY, PERMISSIONS_KEY,
} from '../decorators/permissions.decorator';
import { PermissionAction } from '../enums/permission-action.enum';
import { ModuloPermiso } from '../../module/permiso/enums/modulo-administrativo.enum';
import { PermisoService } from '../../module/permiso/permiso.service';
import type { RequestConAcceso } from '../types/request-con-acceso.type';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permisoService: PermisoService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;
    if (this.reflector.getAllAndOverride<boolean>(AUTHENTICATED_ONLY_KEY, targets)) return true;

    const required = this.reflector.getAllAndOverride<{
      modulo: ModuloPermiso | ModuloPermiso[];
      action: PermissionAction;
    }>(PERMISSIONS_KEY, targets);

    // Default-deny
    if (!required) throw new ForbiddenException('Recurso sin permiso configurado.');

    const request = context.switchToHttp().getRequest<RequestConAcceso>();
    const raw = request.user as unknown as { id?: number; userId?: number; sub?: number } | undefined;
    const userId = raw?.id ?? raw?.userId ?? raw?.sub;
    if (!userId) throw new ForbiddenException('Usuario no identificado.');

    const acceso = await this.permisoService.obtenerAcceso(userId);
    if (!acceso) throw new ForbiddenException('El usuario no tiene un rol activo asignado.');

    request.acceso = acceso;
    if (acceso.esSistema) return true;

    const modulos = Array.isArray(required.modulo) ? required.modulo : [required.modulo];
    const ok = modulos.some((m) =>
      acceso.permisos.some(
        (p) => p.modulo === m && (p as unknown as Record<string, boolean>)[required.action] === true,
      ),
    );

    if (!ok) {
      throw new ForbiddenException(
        `No tiene permiso ${required.action} en: ${modulos.join(', ')}.`,
      );
    }
    return true;
  }
}