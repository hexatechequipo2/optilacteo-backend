export const ROLES = {
  ADMINISTRADOR: 'Administrador',
  GERENTE: 'Gerente',
  OPERARIO_LINEA: 'Operario de línea',
  RESPONSABLE_PRODUCCION: 'Responsable de producción',
  RESPONSABLE_CALIDAD: 'Responsable de calidad'
} as const;

export type RolNombre = typeof ROLES[keyof typeof ROLES];