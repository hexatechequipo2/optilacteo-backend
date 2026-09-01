import {
  ConflictException,
  Inject,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { CreateSkuDto } from './dto/create-sku.dto';
import { UpdateSkuDto } from './dto/update-sku.dto';
import { SkuResponseDto } from './dto/sku-response.dto';
import { SkuMapper } from './mappers/sku.mapper';
import type { ISkuRepository } from './repository/sku-repository.interface';
import { SKU_REPOSITORY } from './repository/sku-repository.interface';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class SkuService {
  constructor(
    @Inject(SKU_REPOSITORY)
    private readonly skuRepository: ISkuRepository,
  ) {}

  private resolveEmpresaId(tenant: TenantContext): number {
    if (tenant.empresaId == null) {
      throw new BadRequestException(
        'No se pudo determinar la empresa del usuario autenticado',
      );
    }
    return tenant.empresaId;
  }

  async create(
    dto: CreateSkuDto,
    tenant: TenantContext,
  ): Promise<SkuResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);

    const existente = await this.skuRepository.findByNombre(
      dto.nombre,
      empresaId,
    );
    if (existente) {
      throw new ConflictException(
        `Ya existe un SKU llamado '${dto.nombre}' para esta empresa`,
      );
    }

    const sku = this.skuRepository.create({
      ...dto,
      empresaId,
      activo: true,
    });
    const saved = await this.skuRepository.save(sku);
    return SkuMapper.toResponseDto(saved);
  }

  async findAll(tenant: TenantContext): Promise<SkuResponseDto[]> {
    const empresaId = this.resolveEmpresaId(tenant);
    const skus = await this.skuRepository.findAllActivosByEmpresa(empresaId);
    return SkuMapper.toResponseDtoList(skus);
  }

  async update(
    id: number,
    dto: UpdateSkuDto,
    tenant: TenantContext,
  ): Promise<SkuResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);
    const sku = await this.skuRepository.findById(id, empresaId);
    if (!sku) {
      throw new NotFoundException(`SKU ${id} no encontrado`);
    }

    if (dto.nombre) sku.nombre = dto.nombre;
    if (dto.unidadMedida) sku.unidadMedida = dto.unidadMedida;

    const saved = await this.skuRepository.save(sku);
    return SkuMapper.toResponseDto(saved);
  }

  async deactivate(id: number, tenant: TenantContext): Promise<SkuResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);
    const sku = await this.skuRepository.findById(id, empresaId);
    if (!sku) {
      throw new NotFoundException(`SKU ${id} no encontrado`);
    }

    sku.activo = false;
    const saved = await this.skuRepository.save(sku);
    return SkuMapper.toResponseDto(saved);
  }

  async activate(id: number, tenant: TenantContext): Promise<SkuResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);
    const sku = await this.skuRepository.findById(id, empresaId);
    if (!sku) {
      throw new NotFoundException(`SKU ${id} no encontrado`);
    }

    if (sku.activo) {
      throw new BadRequestException(`El SKU ${id} ya está activo`);
    }

    sku.activo = true;
    const saved = await this.skuRepository.save(sku);
    return SkuMapper.toResponseDto(saved);
  }
}
