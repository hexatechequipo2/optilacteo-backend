import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TenantContext } from '../../common/types/tenant-context.type';
import {
  PROVEEDOR_REPOSITORY,
  type IProveedorRepository,
} from './repository/proveedor-interface.repository';
import { ProveedorMapper } from './mappers/proveedor.mapper';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { ProveedorResponseDto } from './dto/proveedor-response.dto';
import { ROLES } from '../rol/constants/roles.constants';
import {
  buildPaginatedResponse,
  type PaginatedResponse,
} from '../../common/dto/paginated-response.dto';
import { EstadoProveedor } from './enums/estado-proveedor.enum';
import { ProveedorFilterQueryDto } from './dto/proveedor-filter-query.dto';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class ProveedoresService {
  constructor(
    @Inject(PROVEEDOR_REPOSITORY)
    private readonly proveedorRepository: IProveedorRepository,
    private readonly mapper: ProveedorMapper,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Guardia de seguridad para aislamiento multi-tenant
  private assertOwnEmpresa(proveedor: any, tenant: TenantContext) {
    if (!proveedor || !proveedor.empresa?.id) {
      throw new NotFoundException('Proveedor no encontrado');
    }
    if (
      tenant.rolNombre !== ROLES.ADMINISTRADOR &&
      proveedor.empresa.id !== tenant.empresaId
    ) {
      throw new NotFoundException('Proveedor no encontrado');
    }
  }

  // HU-63: solo Gerente ve quién creó/modificó el proveedor.
  private puedeVerAuditoria(tenant: TenantContext): boolean {
    return tenant.rolNombre === ROLES.GERENTE;
  }

  async findAll(
    tenant: TenantContext,
    query: ProveedorFilterQueryDto,
  ): Promise<PaginatedResponse<ProveedorResponseDto>> {
    const { page, limit, ...filters } = query;
    const skip = (page - 1) * limit;
    const [proveedores, total] =
      await this.proveedorRepository.findAllPaginated(
        tenant,
        skip,
        limit,
        filters,
      );

    let data = this.mapper.toResponseDtoList(proveedores);

    if (this.puedeVerAuditoria(tenant)) {
      const trazabilidadMap = await this.auditLogService.getTrazabilidadBatch(
        'Proveedor',
        proveedores.map((p) => p.id),
        tenant.empresaId,
      );
      data = data.map((dto) => ({
        ...dto,
        auditoria: trazabilidadMap.get(dto.id),
      }));
    }

    return buildPaginatedResponse(data, page, limit, total);
  }

  async findOne(
    id: number,
    tenant: TenantContext,
  ): Promise<ProveedorResponseDto> {
    const proveedor = await this.proveedorRepository.findById(id, tenant);
    if (!proveedor) {
      throw new NotFoundException(`Proveedor con id "${id}" no encontrado`);
    }
    this.assertOwnEmpresa(proveedor, tenant);

    const dto = this.mapper.toResponseDto(proveedor);

    if (this.puedeVerAuditoria(tenant)) {
      dto.auditoria = await this.auditLogService.getTrazabilidad(
        'Proveedor',
        id,
        tenant.empresaId,
      );
    }

    return dto;
  }

  async create(
    dto: CreateProveedorDto,
    tenant: TenantContext,
  ): Promise<ProveedorResponseDto> {
    const empresaId = this.resolveEmpresaId(dto.empresaId, tenant);
    const proveedorPorCuit = await this.proveedorRepository.findByCuit(
      dto.cuit,
    );

    if (proveedorPorCuit) {
      throw new ConflictException({
        field: 'cuit',
        message: 'Ya existe un proveedor con ese CUIT.',
      });
    }
    const proveedorPorRazonSocial =
      await this.proveedorRepository.findByRazonSocial(dto.razonSocial);

    if (proveedorPorRazonSocial) {
      throw new ConflictException({
        field: 'razonSocial',
        message: 'Ya existe un proveedor con esa razón social.',
      });
    }
    const entity = this.mapper.toEntity(dto, empresaId);
    const saved = await this.proveedorRepository.save(entity);
    return this.mapper.toResponseDto(saved);
  }

  async update(
    id: number,
    dto: UpdateProveedorDto,
    tenant: TenantContext,
  ): Promise<ProveedorResponseDto> {
    const proveedor = await this.proveedorRepository.findById(id, tenant);
    if (!proveedor) {
      throw new NotFoundException(`Proveedor con id "${id}" no encontrado`);
    }
    this.assertOwnEmpresa(proveedor, tenant);

    if (dto.cuit && dto.cuit !== proveedor.cuit) {
      const cuitEnUso = await this.proveedorRepository.findByCuit(dto.cuit);
      if (cuitEnUso) {
        throw new ConflictException(
          `El CUIT ${dto.cuit} ya está en uso por otro proveedor`,
        );
      }
    }

    if (dto.razonSocial && dto.razonSocial.trim() !== proveedor.razonSocial) {
      const razonSocialEnUso = await this.proveedorRepository.findByRazonSocial(
        dto.razonSocial,
      );

      if (razonSocialEnUso) {
        throw new ConflictException({
          field: 'razonSocial',
          message: 'Ya existe un proveedor con esa razón social.',
        });
      }
    }

    const empresaId =
      dto.empresaId !== undefined
        ? this.resolveEmpresaId(dto.empresaId, tenant)
        : undefined;
    const updated = this.mapper.applyUpdate(proveedor, dto, empresaId);
    const saved = await this.proveedorRepository.update(updated, tenant);

    if (!saved) {
      throw new NotFoundException(`Proveedor con id "${id}" no encontrado`);
    }
    return this.mapper.toResponseDto(saved);
  }

  async remove(id: number, tenant: TenantContext): Promise<void> {
    const proveedor = await this.proveedorRepository.findById(id, tenant);
    if (!proveedor) {
      throw new NotFoundException(`Proveedor con id "${id}" no encontrado`);
    }
    this.assertOwnEmpresa(proveedor, tenant);

    const deleted = await this.proveedorRepository.softDelete(id, tenant);
    if (!deleted) {
      throw new NotFoundException(`Proveedor con id "${id}" no encontrado`);
    }
  }

  async activate(
    id: number,
    tenant: TenantContext,
  ): Promise<ProveedorResponseDto> {
    const proveedor = await this.proveedorRepository.findById(id, tenant);
    if (!proveedor) {
      throw new NotFoundException(`Proveedor con id "${id}" no encontrado`);
    }
    this.assertOwnEmpresa(proveedor, tenant);

    const updated = await this.proveedorRepository.setEstado(
      id,
      EstadoProveedor.ACTIVA,
      tenant,
    );
    if (!updated) {
      throw new NotFoundException(`Proveedor con id "${id}" no encontrado`);
    }
    const proveedorActualizado = await this.proveedorRepository.findById(
      id,
      tenant,
    );
    return this.mapper.toResponseDto(proveedorActualizado!);
  }

  private resolveEmpresaId(
    bodyEmpresaId: number | undefined,
    tenant: TenantContext,
  ): number {
    if (tenant.rolNombre === ROLES.ADMINISTRADOR) {
      if (bodyEmpresaId === undefined) {
        throw new BadRequestException(
          'El id de empresa es obligatorio para el rol admin',
        );
      }
      return bodyEmpresaId;
    }
    if (tenant.empresaId === null) {
      throw new ForbiddenException('El usuario no tiene una empresa asociada');
    }
    return tenant.empresaId;
  }
}
