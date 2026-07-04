import type { RolNombre } from '../../module/rol/constants/roles.constants';

export interface TenantContext {
  empresaId: number | null;
  rolNombre: RolNombre | null;
}