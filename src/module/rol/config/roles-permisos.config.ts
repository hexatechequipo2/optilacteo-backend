import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';

export type AccionPermiso = 'read' | 'write';

export interface PermisoConfig {
  modulo: ModuloSistema;
  canRead: boolean;
  canWrite: boolean;
}

export const PERMISOS_POR_ROL: Record<string, PermisoConfig[]> = {
  Administrador: Object.values(ModuloSistema).map((modulo) => ({
    modulo,
    canRead: true,
    canWrite: true,
  })),

  Gerente: Object.values(ModuloSistema).map((modulo) => ({
    modulo,
    canRead: true,
    canWrite: false,
  })),

  'Operario de línea': [
    ModuloSistema.RECEPCION,
    ModuloSistema.DESTINO_PRODUCTIVO_IA,
    ModuloSistema.SENSORES_IOT,
    ModuloSistema.ASISTENTE_VOZ,
    ModuloSistema.MONITOREO_ALERTAS,
  ].map((modulo) => ({ modulo, canRead: true, canWrite: false })),

  'Responsable de producción': [
    ModuloSistema.RECEPCION,
    ModuloSistema.DESTINO_PRODUCTIVO_IA,
    ModuloSistema.MONITOREO_ALERTAS,
    ModuloSistema.SENSORES_IOT,
    ModuloSistema.TRAZABILIDAD,
    ModuloSistema.REPORTES_FORECAST,
    ModuloSistema.ASISTENTE_VOZ,
  ].map((modulo) => ({ modulo, canRead: true, canWrite: false })),

  'Responsable de calidad': [
    ModuloSistema.RECEPCION,
    ModuloSistema.DESTINO_PRODUCTIVO_IA,
    ModuloSistema.MONITOREO_ALERTAS,
    ModuloSistema.SENSORES_IOT,
    ModuloSistema.TRAZABILIDAD,
    ModuloSistema.REPORTES_FORECAST,
    ModuloSistema.ASISTENTE_VOZ,
  ].map((modulo) => ({ modulo, canRead: true, canWrite: false })),
};