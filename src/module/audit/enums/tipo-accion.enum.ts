export enum TipoAccion {
  ALTA = 'ALTA',
  BAJA = 'BAJA',
  EDICION = 'EDICION',
  EXPORTACION = 'EXPORTACION',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  CONFIGURACION = 'CONFIGURACION',
  OTRO = 'OTRO',
}

export const TIPO_ACCION_LABELS: Record<TipoAccion, string> = {
  [TipoAccion.ALTA]: 'Alta',
  [TipoAccion.BAJA]: 'Baja',
  [TipoAccion.EDICION]: 'Edición',
  [TipoAccion.EXPORTACION]: 'Exportación',
  [TipoAccion.LOGIN]: 'Inicio de sesión',
  [TipoAccion.LOGOUT]: 'Cierre de sesión',
  [TipoAccion.CONFIGURACION]: 'Configuración',
  [TipoAccion.OTRO]: 'Otro',
};