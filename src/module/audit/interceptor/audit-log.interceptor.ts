
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap, catchError, throwError } from 'rxjs';

import {
  AUDIT_KEY,
  AuditDescripcionContext,
  AuditMetadata,
} from '../decorators/audit-log.decorator';
import { TipoAccion } from '../enums/tipo-accion.enum';
import { AuditLogService } from '../audit-log.service';
import type { AuthenticatedRequest } from '../../auth/guards/jwt-auth.guard';

type DescripcionBuilder = (
  entidad: string,
  entidadId: number | null,
) => string;

interface AuditResponseUser {
  id?: number;
  sub?: number;
  email?: string;
  nombre?: string;
  userNombre?: string;
  nombreCompleto?: string;
  rolNombre?: string;
  empresaId?: number;
}

interface AuditResponseBody {
  user?: AuditResponseUser;
  access_token?: string;
  refresh_token?: string;
  [key: string]: unknown;
}

const DESCRIPCION_GENERICA: Record<TipoAccion, DescripcionBuilder> = {
  [TipoAccion.ALTA]: (entidad, id) =>
    `Alta de ${entidad}${id ? ` #${id}` : ''}`,
  [TipoAccion.BAJA]: (entidad, id) =>
    `Baja de ${entidad}${id ? ` #${id}` : ''}`,
  [TipoAccion.EDICION]: (entidad, id) =>
    `Edición de ${entidad}${id ? ` #${id}` : ''}`,
  [TipoAccion.EXPORTACION]: (entidad) => `Exportación de ${entidad}`,
  [TipoAccion.LOGIN]: () => 'Inicio de sesión',
  [TipoAccion.LOGOUT]: () => 'Cierre de sesión',
  [TipoAccion.CONFIGURACION]: (entidad, id) =>
    `Cambio de configuración en ${entidad}${id ? ` #${id}` : ''}`,
  [TipoAccion.OTRO]: (entidad, id) =>
    `Acción sobre ${entidad}${id ? ` #${id}` : ''}`,
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const auditMeta: AuditMetadata | undefined =
      this.reflector.getAllAndOverride<AuditMetadata>(AUDIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    if (!auditMeta) {
      return next.handle();
    }

    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    return next.handle().pipe(
      tap((responseBody) => {
        this.registerAudit(
          auditMeta,
          request,
          responseBody,
          'SUCCESS',
        ).catch((err: Error) =>
          this.logger.error(
            `Fallo auditando éxito: ${err.message}`,
          ),
        );
      }),
      catchError((error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : 'Error desconocido';

        this.registerAudit(
          auditMeta,
          request,
          { message },
          'FAILURE',
        ).catch((err: Error) =>
          this.logger.error(
            `Fallo auditando error: ${err.message}`,
          ),
        );

        return throwError(() => error);
      }),
    );
  }

  private async registerAudit(
    meta: AuditMetadata,
    request: AuthenticatedRequest,
    data: unknown,
    status: 'SUCCESS' | 'FAILURE',
  ): Promise<void> {
    const requestUser = request.user;

    // En el login, los datos del usuario vienen en la respuesta,
    // porque request.user todavía puede no existir.
    const response =
      data && typeof data === 'object'
        ? (data as AuditResponseBody)
        : undefined;

    const responseUser =
      meta.tipo === TipoAccion.LOGIN && status === 'SUCCESS'
        ? response?.user
        : undefined;

    const userId =
      requestUser?.sub ??
      responseUser?.id ??
      responseUser?.sub ??
      null;

    const userEmail =
      requestUser?.email ??
      responseUser?.email ??
      (request.body as { email?: string } | undefined)?.email ??
      'anonymous';

    const userNombre =
      request.userNombre ??
      responseUser?.nombre ??
      responseUser?.userNombre ??
      responseUser?.nombreCompleto ??
      null;

    const userRol =
      requestUser?.rolNombre ??
      responseUser?.rolNombre ??
      null;

    const empresaId =
      requestUser?.empresaId ??
      responseUser?.empresaId ??
      null;

    const entidadId = this.resolveEntidadId(request, data);

    const descripcionCtx: AuditDescripcionContext = {
      request: {
        params: request.params as Record<string, string>,
        body: request.body,
        query: request.query as Record<string, unknown>,
      },
      responseBody: data,
      status,
    };

    let descripcion: string;

    try {
      descripcion = meta.descripcion
        ? meta.descripcion(descripcionCtx)
        : DESCRIPCION_GENERICA[meta.tipo](
            meta.entidad,
            entidadId,
          );
    } catch (err) {
      this.logger.warn(
        `Fallo generando descripción custom para ${meta.accion}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );

      descripcion = DESCRIPCION_GENERICA[meta.tipo](
        meta.entidad,
        entidadId,
      );
    }

    // Nunca guardar credenciales dentro del detalle de auditoría.
    const detalleData = this.sanitizeAuditData(data);

    await this.auditLogService.record({
      userId,
      userEmail,
      userNombre,
      userRol,
      empresaId,
      accion: `${meta.accion}_${status}`,
      entidad: meta.entidad,
      entidadId,
      tipo: meta.tipo,
      descripcion,
      detalle: {
        status,
        data: detalleData,
      },
    });
  }

  private sanitizeAuditData(data: unknown): unknown {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return data;
    }

    const {
      access_token: _accessToken,
      refresh_token: _refreshToken,
      ...safeData
    } = data as Record<string, unknown>;

    return safeData;
  }

  private resolveEntidadId(
    request: AuthenticatedRequest,
    responseBody: unknown,
  ): number | null {
    const paramId = request.params?.id;

    if (paramId && !Number.isNaN(Number(paramId))) {
      return Number(paramId);
    }

    if (!responseBody || typeof responseBody !== 'object') {
      return null;
    }

    const body = responseBody as Record<string, unknown>;

    if (typeof body.id === 'number') {
      return body.id;
    }

    if (
      body.lote &&
      typeof body.lote === 'object' &&
      typeof (body.lote as Record<string, unknown>).id === 'number'
    ) {
      return (body.lote as Record<string, unknown>).id as number;
    }

    return null;
  }
}