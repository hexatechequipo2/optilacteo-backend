import { PermisoModulo } from '../entities/permiso-modulo.entity';

export interface IPermisoRepository {
  findById(id: number, empresaId: number): Promise<PermisoModulo | null>;
  findByRol(rolId: number, empresaId: number): Promise<PermisoModulo[]>;
  findByUsuario(userId: number, empresaId: number): Promise<PermisoModulo[]>;
  // Usado por AuthService al armar el JWT — sin scoping de request porque
  // se llama en login/refresh, no dentro de un controller con tenant.
  findByRolYEmpresa(
    rolId: number,
    empresaId: number,
  ): Promise<PermisoModulo[]>;
  updatePermiso(
    id: number,
    empresaId: number,
    canRead: boolean,
    canWrite: boolean,
  ): Promise<PermisoModulo>;
}

export const PERMISO_REPOSITORY = 'PERMISO_REPOSITORY';