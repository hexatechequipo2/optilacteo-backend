import { Inject, Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import type { IEmpresaRepository } from './repository/empresa-repository.interface';
import { EMPRESA_REPOSITORY } from './repository/empresa-repository.interface';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { ToggleModuloDto } from './dto/toggle-modulo.dto';
import { EmpresaMapper } from './mappers/empresa.mapper';
import { MODULOS_POR_PLAN } from './config/plan-modulos.config';
import { ModuloSistema } from './enums/modulo-sistema.enum';

@Injectable()
export class EmpresaService {
  constructor(
    @Inject(EMPRESA_REPOSITORY)
    private readonly empresaRepository: IEmpresaRepository,
  ) {}

  async create(dto: CreateEmpresaDto) {
    const empresaToCreate = EmpresaMapper.toEntity(dto);
    const created = await this.empresaRepository.createEmpresa(empresaToCreate);

    const modulosDelPlan = MODULOS_POR_PLAN[created.plan];
    await this.empresaRepository.createModulos(
      modulosDelPlan.map((modulo) => ({
        modulo,
        isActive: true,
        empresa: created,
      })),
    );

    const empresaConModulos = await this.empresaRepository.findById(created.id);
    return EmpresaMapper.toResponse(empresaConModulos!);
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
      ...(dto.plan !== undefined && { plan: dto.plan }),
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

  async activarModulo(empresaId: number, dto: ToggleModuloDto) {
    return this.toggleModulo(empresaId, dto.modulo, true);
  }

  async desactivarModulo(empresaId: number, dto: ToggleModuloDto) {
    return this.toggleModulo(empresaId, dto.modulo, false);
  }

  private async toggleModulo(empresaId: number, modulo: ModuloSistema, activar: boolean) {
    const empresa = await this.empresaRepository.findById(empresaId);
    if (!empresa) {
      throw new NotFoundException(`Empresa con id ${empresaId} no encontrada`);
    }

    const modulosPermitidos = MODULOS_POR_PLAN[empresa.plan];
    if (activar && !modulosPermitidos.includes(modulo)) {
      throw new BadRequestException(
        `El módulo "${modulo}" no está disponible en el plan "${empresa.plan}"`,
      );
    }

    const empresaModulo = await this.empresaRepository.findModulo(empresaId, modulo);
    if (!empresaModulo) {
      throw new NotFoundException(
        `El módulo "${modulo}" no está asignado a la empresa con id ${empresaId}`,
      );
    }

    const updated = await this.empresaRepository.updateModulo(empresaModulo.id, activar);
    return { modulo: updated.modulo, isActive: updated.isActive };
  }
}