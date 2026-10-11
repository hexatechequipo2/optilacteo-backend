import {
  applyDecorators,
  BadRequestException,
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Empresa } from '../../module/empresa/entities/empresa.entity';
import type { AccesoUsuario } from '../../module/permiso/permiso.service';
import type { RequestConAcceso } from '../types/request-con-acceso.type';

export const DESCRIPCION_EMPRESA_ID =
  'Solo para el Administrador (rol de sistema, sin empresa): empresa sobre la que opera; obligatorio. ' +
  'Para cualquier otro rol se usa siempre su propia empresa: puede omitirse, y si indica otra empresa responde 403.';

/**
 * HU-72 (criterio 5): única regla para decidir sobre qué empresa opera un request.
 * - Rol de sistema: la indicada en `empresaId` (obligatoria → 400; inexistente → 404).
 * - Cualquier otro rol: siempre la suya; si pide otra → 403.
 */
export async function resolverEmpresaObjetivo(
  acceso: Pick<AccesoUsuario, 'esSistema' | 'empresaId'>,
  empresaIdPedido: unknown,
  existeEmpresa: (id: number) => Promise<boolean>,
): Promise<number> {
  const pedido =
    empresaIdPedido === undefined || empresaIdPedido === ''
      ? undefined
      : Number(empresaIdPedido);

  if (acceso.esSistema) {
    if (pedido === undefined) {
      throw new BadRequestException(
        'empresaId es obligatorio para el Administrador.',
      );
    }
    if (!Number.isInteger(pedido) || pedido < 1) {
      throw new BadRequestException('empresaId debe ser un entero positivo.');
    }
    if (!(await existeEmpresa(pedido))) {
      throw new NotFoundException('Empresa no encontrada.');
    }
    return pedido;
  }

  if (acceso.empresaId === null) {
    throw new ForbiddenException('El usuario no tiene una empresa asociada.');
  }
  if (pedido !== undefined && pedido !== acceso.empresaId) {
    throw new ForbiddenException('No podés operar sobre otra empresa.');
  }
  return acceso.empresaId;
}

export type RequestConEmpresaObjetivo = RequestConAcceso & {
  empresaObjetivoId?: number;
};

/**
 * Lee `empresaId` de la query o del body (si vienen los dos, deben coincidir)
 * y deja el resultado en `request.empresaObjetivoId`, que también usa la
 * auditoría como "empresa afectada". Corre después del PermissionsGuard global.
 */
@Injectable()
export class EmpresaObjetivoGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestConEmpresaObjetivo>();
    if (!req.acceso) {
      throw new ForbiddenException(
        'El usuario no tiene un rol activo asignado.',
      );
    }

    const enQuery = (req.query as Record<string, unknown> | undefined)
      ?.empresaId;
    const enBody = (req.body as Record<string, unknown> | undefined)?.empresaId;
    if (
      enQuery !== undefined &&
      enBody !== undefined &&
      Number(enQuery) !== Number(enBody)
    ) {
      throw new BadRequestException(
        'empresaId de la query y del body no coinciden.',
      );
    }

    req.empresaObjetivoId = await resolverEmpresaObjetivo(
      req.acceso,
      enQuery ?? enBody,
      (id) => this.dataSource.getRepository(Empresa).existsBy({ id }),
    );
    return true;
  }
}

/** Aplica el guard y documenta `empresaId` (en la query) en Swagger. */
export const ConEmpresaObjetivo = () =>
  applyDecorators(
    UseGuards(EmpresaObjetivoGuard),
    ApiQuery({
      name: 'empresaId',
      required: false,
      type: Number,
      description: DESCRIPCION_EMPRESA_ID,
    }),
  );

/** Empresa resuelta por EmpresaObjetivoGuard. */
export const EmpresaObjetivo = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const id = ctx
      .switchToHttp()
      .getRequest<RequestConEmpresaObjetivo>().empresaObjetivoId;
    if (id === undefined) {
      // Error de programación: falta @ConEmpresaObjetivo() en el handler.
      throw new Error('EmpresaObjetivo usado sin @ConEmpresaObjetivo()');
    }
    return id;
  },
);
