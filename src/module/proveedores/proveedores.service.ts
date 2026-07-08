import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TenantContext } from '../../common/types/tenant-context.type';
import { PROVEEDOR_REPOSITORY, type IProveedorRepository } from './repository/proveedor-interface.repository';
import { ProveedorMapper } from './mappers/proveedor.mapper';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { ProveedorResponseDto } from './dto/proveedor-response.dto';
import { ROLES } from '../rol/constants/roles.constants';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  buildPaginatedResponse,
  type PaginatedResponse,
} from '../../common/dto/paginated-response.dto';
import { EstadoProveedor } from './enums/estado-proveedor.enum';
import { ProveedorFilterQueryDto } from './dto/proveedor-filter-query.dto';

@Injectable()
export class ProveedoresService {
  constructor(
    @Inject(PROVEEDOR_REPOSITORY)
    private readonly proveedorRepository: IProveedorRepository,
    private readonly mapper: ProveedorMapper,
  ) {}

  async findAll(
    tenant: TenantContext,
    query: ProveedorFilterQueryDto,
  ): Promise<PaginatedResponse<ProveedorResponseDto>> {
    const { page, limit, tipo, search } = query;
    const skip = (page - 1) * limit;
    const [proveedores, total] = await this.proveedorRepository.findAllPaginated(
      tenant,
      skip,
      limit,
      { tipo, search },
    );
    return buildPaginatedResponse(
      this.mapper.toResponseDtoList(proveedores),
      page,
      limit,
      total,
    );
  }

  async findOne(id: number, tenant: TenantContext): Promise<ProveedorResponseDto> {
    const proveedor = await this.proveedorRepository.findById(id, tenant);
    if (!proveedor) {
      throw new NotFoundException(`Proveedor con id "${id}" no encontrado`);
    }
    return this.mapper.toResponseDto(proveedor);
  }

  async create(dto: CreateProveedorDto, tenant: TenantContext): Promise<ProveedorResponseDto> {
    const empresaId = this.resolveEmpresaId(dto.empresaId, tenant);
    const existing = await this.proveedorRepository.findByCuit(dto.cuit);
    if (existing) {
      throw new ConflictException(
        `Ya existe un proveedor registrado con el CUIT ${dto.cuit}`,
      );
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
    if (dto.cuit && dto.cuit !== proveedor.cuit) {
      const cuitEnUso = await this.proveedorRepository.findByCuit(dto.cuit);
      if (cuitEnUso) {
        throw new ConflictException(
          `El CUIT ${dto.cuit} ya está en uso por otro proveedor`,
        );
      }
    }
    const empresaId =
      dto.empresaId !== undefined ? this.resolveEmpresaId(dto.empresaId, tenant) : undefined;
    const updated = this.mapper.applyUpdate(proveedor, dto, empresaId);
    const saved = await this.proveedorRepository.update(updated, tenant);
    if (!saved) {
      throw new NotFoundException(`Proveedor con id "${id}" no encontrado`);
    }
    return this.mapper.toResponseDto(saved);
  }

// Soft delete: el proveedor no se borra físicamente, pasa a estado
  // SUSPENDIDA. Sigue apareciendo en findAll (el frontend lo muestra con
  // badge "Suspendida"), pero queda excluido de countByEmpresa (ACTIVA).
  async remove(id: number, tenant: TenantContext): Promise<void> {
    const proveedor = await this.proveedorRepository.findById(id, tenant);
    if (!proveedor) {
      throw new NotFoundException(`Proveedor con id "${id}" no encontrado`);
    }
    const deleted = await this.proveedorRepository.softDelete(id, tenant);
    if (!deleted) {
      throw new NotFoundException(`Proveedor con id "${id}" no encontrado`);
    }
  }

  // Reactiva un proveedor suspendido, devolviéndolo a estado ACTIVA.
  async activate(id: number, tenant: TenantContext): Promise<ProveedorResponseDto> {
    const proveedor = await this.proveedorRepository.findById(id, tenant);
    if (!proveedor) {
      throw new NotFoundException(`Proveedor con id "${id}" no encontrado`);
    }
    const updated = await this.proveedorRepository.setEstado(
      id,
      EstadoProveedor.ACTIVA,
      tenant,
    );
    if (!updated) {
      throw new NotFoundException(`Proveedor con id "${id}" no encontrado`);
    }
    const proveedorActualizado = await this.proveedorRepository.findById(id, tenant);
    return this.mapper.toResponseDto(proveedorActualizado!);
  }

  // Admin gestiona proveedores de cualquier empresa: debe indicar empresaId
  // explícito en el body. El resto de los roles siempre pertenece a una
  // empresa: el valor se fuerza desde el JWT y se ignora lo que venga en el
  // body, para que no puedan crear/reasignar un proveedor a otra empresa.
  private resolveEmpresaId(bodyEmpresaId: number | undefined, tenant: TenantContext): number {
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