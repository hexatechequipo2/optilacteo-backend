import { Rol } from '../entities/rol.entity';
import { PermisoModulo } from '../../permiso/entities/permiso-modulo.entity';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';

export interface IRolRepository {
  findById(id: number): Promise<Rol | null>;
  findAll(): Promise<Rol[]>;
  findByEmpresa(empresaId: number): Promise<Rol[]>;
  createRol(rol: Partial<Rol>): Promise<Rol>;
  updateRol(id: number, rol: Partial<Rol>): Promise<Rol>;
  deleteRol(id: number): Promise<void>;
  hasActiveUsers(id: number): Promise<boolean>;
  createPermisos(permisos: Partial<PermisoModulo>[]): Promise<PermisoModulo[]>;
  findPermiso(rolId: number, modulo: ModuloSistema): Promise<PermisoModulo | null>;
  updatePermiso(id: number, canRead: boolean, canWrite: boolean): Promise<PermisoModulo>;
}

export const ROL_REPOSITORY = 'ROL_REPOSITORY';