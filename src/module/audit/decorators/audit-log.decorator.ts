import { SetMetadata } from '@nestjs/common';
import { TipoAccion } from '../enums/tipo-accion.enum';

export const AUDIT_KEY = 'audit_log_metadata';

export interface AuditDescripcionContext {
  request: {
    params: Record<string, string>;
    body: unknown;
    query: Record<string, unknown>;
  };
  responseBody: unknown;
  status: 'SUCCESS' | 'FAILURE';
}

export interface AuditMetadata {
  accion: string;
  entidad: string;
  tipo: TipoAccion;
  descripcion?: (ctx: AuditDescripcionContext) => string;
}

/**
 * Decorador para marcar endpoints que deben ser auditados.
 * @param accion - Descripción de la acción (ej: 'USUARIO_CREAR')
 * @param entidad - Nombre de la entidad afectada (ej: 'Usuario')
 * @param tipo - Categoría para el filtro "Tipo de acción" del log
 * @param descripcion - Opcional: función que arma el texto legible a partir
 *   del request/response. Si se omite, se genera un texto genérico.
 */
export const AuditLog = (
  accion: string,
  entidad: string,
  tipo: TipoAccion,
  descripcion?: (ctx: AuditDescripcionContext) => string,
) => SetMetadata(AUDIT_KEY, { accion, entidad, tipo, descripcion });