import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';
import { ROLES } from '../../rol/constants/roles.constants';
import type { RolNombre } from '../../rol/constants/roles.constants';
import { ModuloAdministrativo } from '../enums/modulo-administrativo.enum';
import type { ModuloPermiso } from '../enums/modulo-administrativo.enum';
import type { FlagsPermiso } from '../mappers/permiso-flags';

export type RolCatalogo = Exclude<RolNombre, typeof ROLES.ADMINISTRADOR>;

/** R = ver, C = crear, U = editar, D = eliminar, E = exportar. */
type Flags = string;

const RE: Flags = 'RE';
const LECTURA_SISTEMA: Record<ModuloSistema, Flags> = {
  [ModuloSistema.DASHBOARD]: RE,
  [ModuloSistema.RECEPCION]: RE,
  [ModuloSistema.DESTINO_PRODUCTIVO_IA]: RE,
  [ModuloSistema.MONITOREO_ALERTAS]: RE,
  [ModuloSistema.SENSORES_IOT]: RE,
  [ModuloSistema.TRAZABILIDAD]: RE,
  [ModuloSistema.REPORTES_FORECAST]: RE,
  [ModuloSistema.ASISTENTE_VOZ]: RE,
};

/**
 * Matriz con la que arranca cada rol de catálogo en una empresa nueva (HU-72).
 * Un módulo ausente = sin acceso (sin fila). Solo siembra datos: los guards
 * nunca miran nombres de rol, y después el Gerente la edita desde /roles.
 *
 * La migración 1791094778511 lleva una copia literal propia a propósito: si
 * esto cambia, las empresas existentes necesitan una migración nueva.
 */
export const MATRIZ_PERMISOS_POR_DEFECTO: Record<
  RolCatalogo,
  Partial<Record<ModuloPermiso, Flags>>
> = {
  [ROLES.GERENTE]: {
    ...LECTURA_SISTEMA,
    [ModuloSistema.RECEPCION]: 'RCUDE',
    [ModuloSistema.DESTINO_PRODUCTIVO_IA]: 'RCE',
    // Horarios de silencio, resolver y falso positivo (HU-30).
    [ModuloSistema.MONITOREO_ALERTAS]: 'RUE',
    [ModuloSistema.SENSORES_IOT]: 'RCUDE',
    [ModuloSistema.TRAZABILIDAD]: 'RCUDE',
    [ModuloAdministrativo.CONFIGURACION_EMPRESA]: 'RCUD',
    [ModuloAdministrativo.GESTION_ROLES]: 'RCUD',
    [ModuloAdministrativo.GESTION_USUARIOS]: 'RCU',
    [ModuloAdministrativo.AUDITORIA]: 'RE',
  },
  [ROLES.OPERARIO_LINEA]: {
    ...LECTURA_SISTEMA,
    // Mediciones manuales.
    [ModuloSistema.MONITOREO_ALERTAS]: 'RCE',
    // Asociar, editar y activar sensores (HU-33).
    [ModuloSistema.SENSORES_IOT]: 'RUE',
  },
  [ROLES.RESPONSABLE_PRODUCCION]: {
    ...LECTURA_SISTEMA,
    [ModuloSistema.DESTINO_PRODUCTIVO_IA]: 'RCE',
    // Resolver alertas y horarios de silencio (HU-30).
    [ModuloSistema.MONITOREO_ALERTAS]: 'RUE',
    [ModuloSistema.SENSORES_IOT]: 'RCUDE',
    [ModuloSistema.TRAZABILIDAD]: 'RCUE',
    [ModuloAdministrativo.CONFIGURACION_EMPRESA]: 'R',
  },
  [ROLES.RESPONSABLE_CALIDAD]: {
    ...LECTURA_SISTEMA,
    // Lotes y quick-add de proveedor/tambo (HU-60, HU-36).
    [ModuloSistema.RECEPCION]: 'RCE',
    [ModuloSistema.TRAZABILIDAD]: 'RCUE',
    [ModuloAdministrativo.CONFIGURACION_EMPRESA]: 'R',
    [ModuloAdministrativo.GESTION_USUARIOS]: 'R',
  },
};

export interface PermisoPorDefecto extends FlagsPermiso {
  rol: RolCatalogo;
  modulo: ModuloPermiso;
}

/** La matriz como filas (rol, módulo, flags), en orden estable. */
export const filasPermisosPorDefecto = (): PermisoPorDefecto[] =>
  (Object.keys(MATRIZ_PERMISOS_POR_DEFECTO) as RolCatalogo[]).flatMap((rol) =>
    (
      Object.entries(MATRIZ_PERMISOS_POR_DEFECTO[rol]) as [
        ModuloPermiso,
        Flags,
      ][]
    ).map(([modulo, f]) => ({
      rol,
      modulo,
      canRead: f.includes('R'),
      canCreate: f.includes('C'),
      canUpdate: f.includes('U'),
      canDelete: f.includes('D'),
      canExport: f.includes('E'),
    })),
  );
