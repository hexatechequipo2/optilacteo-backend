import { PermisoModulo } from '../entities/permiso-modulo.entity';
import type { AccesoUsuario } from '../permiso.service';
import type { MisPermisosResponseDto } from '../dto/mis-permisos-response.dto';

export class PermisoMapper {
  static toResponse(permiso: PermisoModulo) {
    return {
      id: permiso.id,
      modulo: permiso.modulo,
      canRead: permiso.canRead,
      canCreate: permiso.canCreate,
      canUpdate: permiso.canUpdate,
      canDelete: permiso.canDelete,
      canExport: permiso.canExport,
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
      canCreate: p.canCreate,
      canUpdate: p.canUpdate,
      canDelete: p.canDelete,
      canExport: p.canExport,
    }));
  }

  static toMisPermisosResponse(acceso: AccesoUsuario): MisPermisosResponseDto {
    return {
      esSistema: acceso.esSistema,
      rolNombre: acceso.rolNombre,
      permisos: this.toUserPermisoResponse(acceso.permisos),
    };
  }
}
