import { PermisoModulo } from '../entities/permiso-modulo.entity';

export class PermisoMapper {
  static toResponse(permiso: PermisoModulo) {
    return {
      id: permiso.id,
      modulo: permiso.modulo,
      canRead: permiso.canRead,
      canWrite: permiso.canWrite,
      rol: permiso.rol
        ? { id: permiso.rol.id, nombre: permiso.rol.nombre }
        : null,
    };
  }

  static toResponseList(permisos: PermisoModulo[]) {
    return permisos.map((p) => this.toResponse(p));
  }

  static toUserPermisoResponse(permisos: PermisoModulo[]) {
    return permisos.map((p) => ({
      modulo: p.modulo,
      canRead: p.canRead,
      canWrite: p.canWrite,
    }));
  }
}