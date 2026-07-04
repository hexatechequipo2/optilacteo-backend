import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IPermisoRepository } from './repository/permiso-interface.repository';
import { PERMISO_REPOSITORY } from './repository/permiso-interface.repository';
import { UpdatePermisoDto } from './dto/update-permiso.dto';
import { PermisoMapper } from './mappers/permiso.mapper';

@Injectable()
export class PermisoService {
  constructor(
    @Inject(PERMISO_REPOSITORY)
    private readonly permisoRepository: IPermisoRepository,
  ) {}

  async findByRol(rolId: number) {
    const permisos = await this.permisoRepository.findByRol(rolId);
    return PermisoMapper.toResponseList(permisos);
  }

  async findByUsuario(userId: number) {
    const permisos = await this.permisoRepository.findByUsuario(userId);
    return PermisoMapper.toUserPermisoResponse(permisos);
  }

  async findOne(id: number) {
    const permiso = await this.permisoRepository.findById(id);
    if (!permiso) {
      throw new NotFoundException(`Permiso con id ${id} no encontrado`);
    }
    return PermisoMapper.toResponse(permiso);
  }

  async update(id: number, dto: UpdatePermisoDto) {
    await this.findOne(id); // valida que exista, lanza 404 si no
    const updated = await this.permisoRepository.updatePermiso(
      id,
      dto.canRead,
      dto.canWrite,
    );
    return PermisoMapper.toResponse(updated);
  }
}