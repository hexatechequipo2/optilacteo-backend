import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { CreateIngresoCamaraDto } from './dto/create-ingreso-camara.dto';
import { IngresoCamaraFilterQueryDto } from './dto/ingreso-camara-filter-query.dto';
import { IngresoCamaraMapper } from './mappers/ingreso-camara.mapper';
import type { IIngresoCamaraRepository } from './repository/ingreso-camara-repository.interface';
import { INGRESO_CAMARA_REPOSITORY } from './repository/ingreso-camara-repository.interface';
import type { ISkuRepository } from './repository/sku-repository.interface';
import { SKU_REPOSITORY } from './repository/sku-repository.interface';
import type { ILoteRepository } from './repository/lote-repository.interface';
import { LOTE_REPOSITORY } from './repository/lote-repository.interface';

@Injectable()
export class IngresoCamaraService {
  constructor(
    @Inject(INGRESO_CAMARA_REPOSITORY)
    private readonly ingresoCamaraRepository: IIngresoCamaraRepository,
    @Inject(SKU_REPOSITORY)
    private readonly skuRepository: ISkuRepository,
    @Inject(LOTE_REPOSITORY)
    private readonly loteRepository: ILoteRepository,
  ) {}

  private resolveEmpresaId(tenant: TenantContext): number {
    if (tenant.empresaId == null) {
      throw new BadRequestException(
        'No se pudo determinar la empresa del usuario autenticado',
      );
    }
    return tenant.empresaId;
  }

  async create(dto: CreateIngresoCamaraDto, tenant: TenantContext) {
    const empresaId = this.resolveEmpresaId(tenant);

    const sku = await this.skuRepository.findById(dto.skuId, empresaId);
    if (!sku || !sku.activo) {
      throw new NotFoundException(
        `El SKU ${dto.skuId} no existe, no pertenece a la empresa, o está desactivado`,
      );
    }

    if (dto.loteId != null) {
      const lote = await this.loteRepository.findById(dto.loteId, empresaId);
      if (!lote) {
        throw new NotFoundException(
          `El lote de origen ${dto.loteId} no existe o no pertenece a la empresa`,
        );
      }
    }

    const ingreso = this.ingresoCamaraRepository.create({
      empresaId,
      skuId: dto.skuId,
      cantidad: dto.cantidad,
      loteId: dto.loteId ?? null,
      fechaIngreso: new Date(dto.fechaIngreso),
    });

    const saved = await this.ingresoCamaraRepository.save(ingreso);

    // Recargar con relaciones para completar skuNombre/loteCodigo en la respuesta
    const completo = await this.ingresoCamaraRepository.findById(
      saved.id,
      empresaId,
    );

    return IngresoCamaraMapper.toResponseDto(completo ?? saved);
  }

  async findAll(query: IngresoCamaraFilterQueryDto, tenant: TenantContext) {
    const empresaId = this.resolveEmpresaId(tenant);
    const [ingresos, total] = await this.ingresoCamaraRepository.findAll(
      query,
      empresaId,
    );

    return {
      data: IngresoCamaraMapper.toResponseDtoList(ingresos),
      total,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };
  }
}
