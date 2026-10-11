/**
 * Matriz por defecto aprobada en HU-72, escrita a mano (no se deriva de la
 * constante ni de la migración: ambas se comparan contra esto).
 * R = ver, C = crear, U = editar, D = eliminar, E = exportar. '' = sin fila.
 */
export const MODULOS_MATRIZ = [
  'dashboard',
  'recepcion',
  'destino_productivo_ia',
  'monitoreo_alertas',
  'sensores_iot',
  'trazabilidad',
  'reportes_forecast',
  'asistente_voz',
  'configuracion_empresa',
  'gestion_roles',
  'gestion_usuarios',
  'auditoria',
] as const;

// prettier-ignore
export const MATRIZ_APROBADA: Record<string, string[]> = {
  //                           dash  recep    dest   monit  sensor   traz     forec asist conf    roles   usuar  audit
  'Gerente':                   ['RE', 'RCUDE', 'RCE', 'RUE', 'RCUDE', 'RCUDE', 'RE', 'RE', 'RCUD', 'RCUD', 'RCU', 'RE'],
  'Operario de línea':         ['RE', 'RE',    'RE',  'RCE', 'RUE',   'RE',    'RE', 'RE', '',     '',     '',    ''],
  'Responsable de producción': ['RE', 'RE',    'RCE', 'RUE', 'RCUDE', 'RCUE',  'RE', 'RE', 'R',    '',     '',    ''],
  'Responsable de calidad':    ['RE', 'RCE',   'RE',  'RE',  'RE',    'RCUE',  'RE', 'RE', 'R',    '',     'R',   ''],
};

export interface FilaFlags {
  rol: string;
  modulo: string;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
}

/** (rol, módulo) → 'RCUDE' normalizado, solo celdas con acceso. */
export const aFlags = (f: Omit<FilaFlags, 'rol' | 'modulo'>) =>
  [
    f.canRead && 'R',
    f.canCreate && 'C',
    f.canUpdate && 'U',
    f.canDelete && 'D',
    f.canExport && 'E',
  ]
    .filter(Boolean)
    .join('');

export const matrizComoMapa = (filas: FilaFlags[]) =>
  Object.fromEntries(
    filas
      .map((f) => [`${f.rol}|${f.modulo}`, aFlags(f)] as const)
      .sort(([a], [b]) => a.localeCompare(b)),
  );

export const MAPA_APROBADO: Record<string, string> = Object.fromEntries(
  Object.entries(MATRIZ_APROBADA)
    .flatMap(([rol, celdas]) =>
      celdas.map((f, i) => [`${rol}|${MODULOS_MATRIZ[i]}`, f] as const),
    )
    .filter(([, f]) => f !== '')
    .sort(([a], [b]) => a.localeCompare(b)),
);
