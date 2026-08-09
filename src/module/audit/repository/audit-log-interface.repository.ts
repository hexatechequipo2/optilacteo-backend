import { AuditLog } from '../entity/audit-log.entity';
import type { TenantContext } from '../../../common/types/tenant-context.type';

export const AUDIT_LOG_REPOSITORY = 'AUDIT_LOG_REPOSITORY';

export interface CreateAuditLogData {
  userId: number | null;
  userEmail: string;
  empresaId: number | null;
  accion: string;
  entidad: string;
  entidadId: number | null;
  detalle?: Record<string, unknown> | null;
}

export interface IAuditLogRepository {
  create(data: CreateAuditLogData): Promise<AuditLog>;
  findAllScoped(
    tenant: TenantContext,
    skip: number,
    take: number,
  ): Promise<[AuditLog[], number]>;

  // HU-63: trazabilidad genérica por entidad — reusable en cualquier módulo.
  // Trae todos los registros _SUCCESS (ordenados ASC por createdAt) para
  // los entidadId pedidos; el service arma primero/último por cada uno.
  findPrimerosYUltimos(
    entidad: string,
    entidadIds: number[],
    empresaId: number | null,
  ): Promise<AuditLog[]>;
}
