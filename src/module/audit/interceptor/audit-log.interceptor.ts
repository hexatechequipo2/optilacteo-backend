import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap, catchError, throwError } from 'rxjs'; // <--- Importaciones clave

import { AUDIT_KEY, AuditMetadata } from '../decorators/audit-log.decorator';
import { AuditLogService } from '../audit-log.service';
import type { AuthenticatedRequest } from '../../auth/guards/jwt-auth.guard';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditMeta = this.reflector.getAllAndOverride<AuditMetadata | undefined>(
      AUDIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!auditMeta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return next.handle().pipe(
      tap((responseBody) => {
        // Registro de éxito
        this.registerAudit(auditMeta, request, responseBody, 'SUCCESS').catch((err) =>
          this.logger.error(`Fallo auditando éxito: ${err.message}`),
        );
      }),
      catchError((error) => {
        // Registro de error
        this.registerAudit(auditMeta, request, { message: error.message }, 'FAILURE').catch((err) =>
          this.logger.error(`Fallo auditando error: ${err.message}`),
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
    const user = request.user;

    // Si no hay usuario, intentamos obtener el email del body (si es login)
    // o dejamos los campos de usuario como null/0
    const userId = user?.sub ?? null;
    const userEmail = user?.email ?? request.body?.email ?? 'anonymous';
    const empresaId = user?.empresaId ?? null;

    await this.auditLogService.record({
      userId,
      userEmail,
      empresaId,
      accion: `${meta.accion}_${status}`, 
      entidad: meta.entidad,
      entidadId: this.resolveEntidadId(request, data),
      detalle: { status, data },
    });
  }

  private resolveEntidadId(request: AuthenticatedRequest, responseBody: unknown): number | null {
    const paramId = request.params?.id;
    if (paramId && !Number.isNaN(Number(paramId))) return Number(paramId);

    if (responseBody && typeof responseBody === 'object' && 'id' in (responseBody as Record<string, unknown>)) {
      const id = (responseBody as Record<string, unknown>).id;
      return typeof id === 'number' ? id : null;
    }
    return null;
  }
}