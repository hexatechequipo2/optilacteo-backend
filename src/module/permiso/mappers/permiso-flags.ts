export interface FlagsPermiso {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
}

export type EstadoCelda =
  | 'SIN_ACCESO'
  | 'SOLO_VER'
  | 'VER_Y_MODIFICAR'
  | 'PERSONALIZADO';

const SIN_ACCESO: FlagsPermiso = {
  canRead: false, canCreate: false, canUpdate: false, canDelete: false, canExport: false,
};
const SOLO_VER: FlagsPermiso = { ...SIN_ACCESO, canRead: true };
const VER_Y_MODIFICAR: FlagsPermiso = {
  ...SIN_ACCESO, canRead: true, canCreate: true, canUpdate: true, canDelete: true,
};

export function flagsDesdeEstado(
  e: Exclude<EstadoCelda, 'PERSONALIZADO'>,
): FlagsPermiso {
  return { ...{ SIN_ACCESO, SOLO_VER, VER_Y_MODIFICAR }[e] };
}

const iguales = (a: FlagsPermiso, b: FlagsPermiso) =>
  (Object.keys(a) as (keyof FlagsPermiso)[]).every((k) => a[k] === b[k]);

export function estadoDesdeFlags(f: FlagsPermiso): EstadoCelda {
  if (iguales(f, SIN_ACCESO)) return 'SIN_ACCESO';
  if (iguales(f, SOLO_VER)) return 'SOLO_VER';
  if (iguales(f, VER_Y_MODIFICAR)) return 'VER_Y_MODIFICAR';
  return 'PERSONALIZADO';
}

/** Cualquier acción implica poder ver. */
export const normalizar = (f: FlagsPermiso): FlagsPermiso => ({
  ...f,
  canRead: f.canRead || f.canCreate || f.canUpdate || f.canDelete || f.canExport,
});

export const sinAcceso = (f: FlagsPermiso) =>
  !f.canRead && !f.canCreate && !f.canUpdate && !f.canDelete && !f.canExport;

export const gestionaRoles = (f?: Partial<FlagsPermiso>) =>
  !!f?.canRead && !!f?.canUpdate;