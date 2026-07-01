import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../module/auth/guards/jwt-auth.guard';
import { Role } from '../../module/user/enums/role.enum';
import type { TenantContext } from '../types/tenant-context.type';

export const CurrentEmpresa = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return {
      empresaId: request.user?.empresaId ?? null,
      isAdmin: request.user?.role === Role.ADMIN,
    };
  },
);
