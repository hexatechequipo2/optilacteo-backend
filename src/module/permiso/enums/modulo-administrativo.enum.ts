import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';

export enum ModuloAdministrativo {
  GESTION_ROLES = 'gestion_roles',
  GESTION_USUARIOS = 'gestion_usuarios',
  AUDITORIA = 'auditoria',
  // Solo el rol esSistema (Administrador) accede. Ninguna empresa puede otorgarlo.
  PLATAFORMA = 'plataforma',
}

export type ModuloPermiso = ModuloSistema | ModuloAdministrativo;

export const TODOS_LOS_MODULOS_PERMISO: ModuloPermiso[] = [
  ...Object.values(ModuloSistema),
  ...Object.values(ModuloAdministrativo),
];

/**
 * Módulos administrativos que el Gerente de una empresa puede gestionar y
 * otorgar a otros roles. PLATAFORMA queda afuera a propósito.
 */
export const MODULOS_ADMIN_OTORGABLES: ModuloAdministrativo[] = [
  ModuloAdministrativo.GESTION_ROLES,
  ModuloAdministrativo.GESTION_USUARIOS,
  ModuloAdministrativo.AUDITORIA,
];