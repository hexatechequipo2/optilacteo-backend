import { AuditLog } from '../entity/audit-log.entity';
import type { TenantContext } from '../../../common/types/tenant-context.type';

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');

export interface CreateAuditLogData {
  userId: number | null;
  userEmail: string;
  empresaId: number | null;
  accion: string;
  entidad: string;
  entidadId?: number | null;
  detalle?: Record<string, unknown> | null;
}

export interface IAuditLogRepository {
  create(data: CreateAuditLogData): Promise<AuditLog>;

  // ADMIN ve todo, el resto de roles solo ve auditoría de su propia empresa
  // (mismo criterio que TenantScopedRepository).
  findAllScoped(
    tenant: TenantContext,
    skip: number,
    take: number,
  ): Promise<[AuditLog[], number]>;
}