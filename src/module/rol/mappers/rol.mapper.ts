import { Rol } from '../entities/rol.entity';
import { CreateRolDto } from '../dto/create-rol.dto';
import { Empresa } from '../../empresa/entities/empresa.entity';

export class RolMapper {
  static toEntity(dto: CreateRolDto, empresa: Empresa): Partial<Rol> {
    return {
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      empresa,
    };
  }

  static toResponse(rol: Rol) {
    return {
      id: rol.id,
      nombre: rol.nombre,
      descripcion: rol.descripcion ?? null,
      isActive: rol.isActive,
      empresa: rol.empresa
        ? { id: rol.empresa.id, name: rol.empresa.name }
        : null,
      permisos: rol.permisos?.map((p) => ({
        modulo: p.modulo,
        canRead: p.canRead,
        canWrite: p.canWrite,
      })) ?? [],
    };
  }

  static toResponseList(roles: Rol[]) {
    return roles.map((rol) => this.toResponse(rol));
  }
}