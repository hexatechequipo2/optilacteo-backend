import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import type { IEmpresaRepository } from './repository/empresa-repository.interface';
import { EMPRESA_REPOSITORY } from './repository/empresa-repository.interface';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { EmpresaMapper } from './mappers/empresa.mapper';

@Injectable()
export class EmpresaService {
  constructor(
    @Inject(EMPRESA_REPOSITORY)
    private readonly empresaRepository: IEmpresaRepository,
  ) {}

  async create(dto: CreateEmpresaDto) {
    const empresaToCreate = EmpresaMapper.toEntity(dto);
    const created = await this.empresaRepository.createEmpresa(empresaToCreate);
    return EmpresaMapper.toResponse(created);
  }

  async findAll() {
    const empresas = await this.empresaRepository.findAll();
    return EmpresaMapper.toResponseList(empresas);
  }

  async findOne(id: number) {
    const empresa = await this.empresaRepository.findById(id);
    if (!empresa) {
      throw new NotFoundException(`Empresa con id ${id} no encontrada`);
    }
    return EmpresaMapper.toResponse(empresa);
  }

  async update(id: number, dto: UpdateEmpresaDto) {
    await this.findOne(id);

    const empresaToUpdate = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.cuit !== undefined && { cuit: dto.cuit }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.telefono !== undefined && { telefono: dto.telefono }),
      ...(dto.direccion !== undefined && { direccion: dto.direccion }),
    };

    const updated = await this.empresaRepository.updateEmpresa(id, empresaToUpdate);
    return EmpresaMapper.toResponse(updated);
  }

  async deactivate(id: number) {
    await this.findOne(id);

    const tieneUsuariosActivos = await this.empresaRepository.hasActiveUsers(id);
    if (tieneUsuariosActivos) {
      throw new ConflictException(
        'No se puede desactivar una empresa que tiene usuarios activos asociados',
      );
    }

    const updated = await this.empresaRepository.updateEmpresa(id, { isActive: false });
    return EmpresaMapper.toResponse(updated);
  }

  async activate(id: number) {
    await this.findOne(id);
    const updated = await this.empresaRepository.updateEmpresa(id, { isActive: true });
    return EmpresaMapper.toResponse(updated);
  }

  async remove(id: number) {
    return this.deactivate(id);
  }
}