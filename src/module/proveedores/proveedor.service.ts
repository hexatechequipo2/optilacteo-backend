import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
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
import { EstabilidadProveedorService } from '../estabilidad-proveedor/estabilidad-proveedor.service'; // HU-64

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class ProveedoresService {
  constructor(
    @Inject(PROVEEDOR_REPOSITORY)
    private readonly proveedorRepository: IProveedorRepository,
    private readonly mapper: ProveedorMapper,
    private readonly auditLogService: AuditLogService,
    private readonly estabilidadService: EstabilidadProveedorService, // HU-64
  ) {}

  // Guardia de seguridad para aislamiento multi-tenant
  private assertOwnEmpresa(proveedor: any, tenant: TenantContext) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!proveedor || !proveedor.empresa?.id) {
      throw new NotFoundException('Proveedor no encontrado');
    }
    if (
      tenant.rolNombre !== ROLES.ADMINISTRADOR &&
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      proveedor.empresa.id !== tenant.empresaId
    ) {
      throw new NotFoundException('Proveedor no encontrado');
    }
  }

  // HU-63: solo Gerente ve quién creó/modificó el proveedor.
  private puedeVerAuditoria(tenant: TenantContext): boolean {
    return tenant.rolNombre === ROLES.GERENTE;
  }

  // Respaldo ante condiciones de carrera: la BD es la última barrera.
  private rethrowIfUniqueViolation(error: unknown): never {
    if (
      error instanceof QueryFailedError &&
      (error as QueryFailedError & { driverError?: { code?: string } })
        .driverError?.code === PG_UNIQUE_VIOLATION
    ) {
      throw new ConflictException({
        field: 'cuit',
        message: 'Ya existe un proveedor con ese CUIT en la empresa.',
      });
    }
    throw error;
  }

  private async assertCuitDisponible(
    cuit: string,
    empresaId: number,
    excluirId?: number,
  ): Promise<void> {
    const existente = await this.proveedorRepository.findByCuit(
      cuit,
      empresaId,
    );
    if (existente && existente.id !== excluirId) {
      throw new ConflictException({
        field: 'cuit',
        message: 'Ya existe un proveedor con ese CUIT en la empresa.',
      });
    }
  }

  private async assertRazonSocialDisponible(
    razonSocial: string,
    empresaId: number,
    excluirId?: number,
  ): Promise<void> {
    const existente = await this.proveedorRepository.findByRazonSocial(
      razonSocial,
      empresaId,
    );
    if (existente && existente.id !== excluirId) {
      throw new ConflictException({
        field: 'razonSocial',
        message: 'Ya existe un proveedor con esa razón social en la empresa.',
      });
    }
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

    // HU-64 AC2/AC4: indicador de estabilidad en la ficha. Se usa la empresa
    // del proveedor (no la del tenant) porque un admin puede ver proveedores
    // de otra empresa.
    dto.estabilidad = await this.estabilidadService.obtener(
      id,
      proveedor.empresa.id,
    );

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

    // La unicidad se evalúa únicamente dentro de la empresa destino.
    await this.assertCuitDisponible(dto.cuit, empresaId);
    await this.assertRazonSocialDisponible(dto.razonSocial, empresaId);

    const entity = this.mapper.toEntity(dto, empresaId);
    try {
      const saved = await this.proveedorRepository.save(entity);
      return this.mapper.toResponseDto(saved);
    } catch (error) {
      this.rethrowIfUniqueViolation(error);
    }
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

    const empresaId =
      dto.empresaId !== undefined
        ? this.resolveEmpresaId(dto.empresaId, tenant)
        : undefined;

    // Empresa contra la cual se valida la unicidad (la destino si cambia).
    const empresaDestino = empresaId ?? proveedor.empresa.id;
    const cambiaEmpresa =
      empresaId !== undefined && empresaId !== proveedor.empresa.id;

    if (dto.cuit && (dto.cuit !== proveedor.cuit || cambiaEmpresa)) {
      await this.assertCuitDisponible(dto.cuit, empresaDestino, id);
    }

    if (
      dto.razonSocial &&
      (dto.razonSocial.trim() !== proveedor.razonSocial || cambiaEmpresa)
    ) {
      await this.assertRazonSocialDisponible(
        dto.razonSocial,
        empresaDestino,
        id,
      );
    }

    // Si no se manda cuit/razonSocial pero cambia la empresa, hay que validar
    // igualmente los valores actuales contra la empresa destino.
    if (cambiaEmpresa) {
      if (!dto.cuit) {
        await this.assertCuitDisponible(proveedor.cuit, empresaDestino, id);
      }
      if (!dto.razonSocial) {
        await this.assertRazonSocialDisponible(
          proveedor.razonSocial,
          empresaDestino,
          id,
        );
      }
    }

    const updated = this.mapper.applyUpdate(proveedor, dto, empresaId);
    try {
      const saved = await this.proveedorRepository.update(updated, tenant);
      if (!saved) {
        throw new NotFoundException(`Proveedor con id "${id}" no encontrado`);
      }
      return this.mapper.toResponseDto(saved);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.rethrowIfUniqueViolation(error);
    }
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