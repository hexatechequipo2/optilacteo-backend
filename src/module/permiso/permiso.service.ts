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

  async findByRol(rolId: number, empresaId: number) {
    const permisos = await this.permisoRepository.findByRol(rolId, empresaId);
    return PermisoMapper.toResponseList(permisos);
  }

  async findByUsuario(userId: number, empresaId: number) {
    const permisos = await this.permisoRepository.findByUsuario(userId, empresaId);
    return PermisoMapper.toUserPermisoResponse(permisos);
  }

  async findOne(id: number, empresaId: number) {
    const permiso = await this.permisoRepository.findById(id, empresaId);
    if (!permiso) {
      throw new NotFoundException(
        `Permiso con id ${id} no encontrado en tu empresa`,
      );
    }
    return PermisoMapper.toResponse(permiso);
  }

  async update(id: number, empresaId: number, dto: UpdatePermisoDto) {
    await this.findOne(id, empresaId); // valida existencia Y pertenencia, 404 si no
    const updated = await this.permisoRepository.updatePermiso(
      id,
      empresaId,
      dto.canRead,
      dto.canWrite,
    );
    return PermisoMapper.toResponse(updated);
  }
}