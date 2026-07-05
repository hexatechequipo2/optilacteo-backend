import { PermisoModulo } from '../entities/permiso-modulo.entity';

export interface IPermisoRepository {
  findById(id: number): Promise<PermisoModulo | null>;
  findByRol(rolId: number): Promise<PermisoModulo[]>;
  findByUsuario(userId: number): Promise<PermisoModulo[]>;
  updatePermiso(id: number, canRead: boolean, canWrite: boolean): Promise<PermisoModulo>;
}

export const PERMISO_REPOSITORY = 'PERMISO_REPOSITORY';