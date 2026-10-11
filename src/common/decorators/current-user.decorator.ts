import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestConAcceso } from '../types/request-con-acceso.type';

export interface AuthenticatedUser {
  id: number;
  rolId: number | null;
  empresaId: number | null;
  esSistema: boolean;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest<RequestConAcceso>();
    if (req.acceso) {
      return {
        id: req.acceso.userId,
        rolId: req.acceso.rolId,
        empresaId: req.acceso.empresaId,
        esSistema: req.acceso.esSistema,
      };
    }
    const u = req.user as unknown as { id?: number; userId?: number; sub?: number; rolId?: number | null; empresaId?: number | null };
    return {
      id: (u?.id ?? u?.userId ?? u?.sub) as number,
      rolId: u?.rolId ?? null,
      empresaId: u?.empresaId ?? null,
      esSistema: false,
    };
  },
);