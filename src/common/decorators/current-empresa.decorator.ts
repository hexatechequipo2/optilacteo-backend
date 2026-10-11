import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TenantContext } from '../types/tenant-context.type';
import type { RequestConAcceso } from '../types/request-con-acceso.type';

export const CurrentEmpresa = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const req = ctx.switchToHttp().getRequest<RequestConAcceso>();
    return {
      // Prioriza lo que leyó el guard de la BD; cae al JWT si la ruta no pasó por @Permissions
      empresaId: req.acceso?.empresaId ?? req.user?.empresaId ?? null,
      rolNombre: req.user?.rolNombre ?? null,
    };
  },
);