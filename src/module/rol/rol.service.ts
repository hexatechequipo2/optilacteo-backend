import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IRolRepository } from './repository/rol-interface.repository';
import { ROL_REPOSITORY } from './repository/rol-interface.repository';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { UpdatePermisoDto } from '../permiso/dto/update-permiso.dto';
import { RolMapper } from './mappers/rol.mapper';
import { Empresa } from '../empresa/entities/empresa.entity';
import { PERMISOS_POR_ROL } from './config/roles-permisos.config';
import { User } from '../user/entities/user.entity';

@Injectable()
export class RolService {
  constructor(
    @Inject(ROL_REPOSITORY)
    private readonly rolRepository: IRolRepository,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateRolDto) {
    const empresa = await this.findEmpresaOrFail(dto.empresaId);
    const rolToCreate = RolMapper.toEntity(dto, empresa);
    const created = await this.rolRepository.createRol(rolToCreate);

    // Auto-asignar permisos si el nombre coincide con uno predefinido
    const permisosDefault = PERMISOS_POR_ROL[dto.nombre];
    if (permisosDefault) {
      await this.rolRepository.createPermisos(
        permisosDefault.map((p) => ({ ...p, rol: created })),
      );
    }

    const rolConPermisos = await this.rolRepository.findById(created.id);
    return RolMapper.toResponse(rolConPermisos!);
  }

  async findAll() {
    const roles = await this.rolRepository.findAll();
    return RolMapper.toResponseList(roles);
  }

  async findByEmpresa(empresaId: number) {
    const roles = await this.rolRepository.findByEmpresa(empresaId);
    return RolMapper.toResponseList(roles);
  }

  async findOne(id: number) {
    const rol = await this.rolRepository.findById(id);
    if (!rol) {
      throw new NotFoundException(`Rol con id ${id} no encontrado`);
    }
    return RolMapper.toResponse(rol);
  }

  async update(id: number, dto: UpdateRolDto) {
    await this.findOne(id);

    const rolToUpdate = {
      ...(dto.nombre !== undefined && { nombre: dto.nombre }),
      ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
    };

    const updated = await this.rolRepository.updateRol(id, rolToUpdate);
    return RolMapper.toResponse(updated);
  }

  async remove(id: number) {
    await this.findOne(id);

    // HU-02 punto 4: no se puede eliminar un rol con usuarios activos
    const usuariosConRol = await this.userRepository.count({
      where: { rol: { id }, isActive: true },
    });

    if (usuariosConRol > 0) {
      throw new ConflictException(
        'No se puede eliminar un rol que tiene usuarios activos asignados',
      );
    }

    await this.rolRepository.deleteRol(id);
    return { message: `Rol con id ${id} eliminado correctamente` };
  }

  async updatePermiso(rolId: number, dto: UpdatePermisoDto) {
    await this.findOne(rolId);

    const permiso = await this.rolRepository.findPermiso(rolId, dto.modulo);
    if (!permiso) {
      // Si no existe el permiso para ese módulo, lo creamos
      const rol = await this.rolRepository.findById(rolId);
      await this.rolRepository.createPermisos([{
        modulo: dto.modulo,
        canRead: dto.canRead,
        canWrite: dto.canWrite,
        rol: rol!,
      }]);
    } else {
      await this.rolRepository.updatePermiso(permiso.id, dto.canRead, dto.canWrite);
    }

    const updated = await this.rolRepository.findById(rolId);
    return RolMapper.toResponse(updated!);
  }

  private async findEmpresaOrFail(empresaId: number): Promise<Empresa> {
    const empresa = await this.empresaRepository.findOneBy({ id: empresaId });
    if (!empresa) {
      throw new NotFoundException(`Empresa con id ${empresaId} no encontrada`);
    }
    return empresa;
  }
}