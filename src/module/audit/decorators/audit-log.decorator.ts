import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit_log_metadata';

export interface AuditMetadata {
  accion: string;
  entidad: string;
}

/**
 * Decorador para marcar endpoints que deben ser auditados.
 * @param accion - Descripción de la acción (ej: 'USUARIO_CREAR')
 * @param entidad - Nombre de la entidad afectada (ej: 'Usuario')
 */
export const AuditLog = (accion: string, entidad: string) => 
  SetMetadata(AUDIT_KEY, { accion, entidad } as AuditMetadata);