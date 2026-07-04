import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';
import { RolNombre } from '../../rol/constants/roles.constants';

export interface PermisoPayload {
  modulo: ModuloSistema;
  canRead: boolean;
  canWrite: boolean;
}

export interface JwtPayload {
  sub: number;
  email: string;
  rolId: number | null;
  rolNombre: RolNombre | null;
  permisos: PermisoPayload[];
  empresaId: number | null;
  jti: string;
  exp?: number;
}