import { AuditLog } from '../entity/audit-log.entity';
import type { TenantContext } from '../../../common/types/tenant-context.type';
import { TipoAccion } from '../enums/tipo-accion.enum';

export const AUDIT_LOG_REPOSITORY = 'AUDIT_LOG_REPOSITORY';

export interface CreateAuditLogData {
  userId: number | null;
  userEmail: string;
  userNombre: string | null;
  userRol: string | null;
  empresaId: number | null;
  accion: string;
  entidad: string;
  entidadId: number | null;
  tipo: TipoAccion;
  descripcion: string | null;
  detalle?: Record<string, unknown> | null;
}

export interface AuditLogFilters {
  userId?: number;
  accion?: string;
  estado?: 'SUCCESS' | 'FAILURE';
  tipo?: TipoAccion;
  fechaDesde?: Date;
  fechaHasta?: Date;
}

export interface IAuditLogRepository {
  create(data: CreateAuditLogData): Promise<AuditLog>;

  findFiltered(
    tenant: TenantContext,
    filters: AuditLogFilters,
    skip: number,
    take: number,
  ): Promise<[AuditLog[], number]>;

  // Igual que findFiltered pero sin paginar; usado para exportación,
  // capado a EXPORT_MAX_ROWS como salvaguarda.
  findAllMatching(
    tenant: TenantContext,
    filters: AuditLogFilters,
  ): Promise<AuditLog[]>;

  // HU-63: trazabilidad genérica por entidad — reusable en cualquier módulo.
  findPrimerosYUltimos(
    entidad: string,
    entidadIds: number[],
    empresaId: number | null,
  ): Promise<AuditLog[]>;
}