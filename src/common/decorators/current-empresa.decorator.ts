import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../module/auth/guards/jwt-auth.guard';
import type { TenantContext } from '../types/tenant-context.type';
import type { RolNombre } from '../../module/rol/constants/roles.constants';

export const CurrentEmpresa = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    return {
      empresaId: request.user?.empresaId ?? null,
      rolNombre: (request.user?.rolNombre as RolNombre) ?? null,
    };
  },
);