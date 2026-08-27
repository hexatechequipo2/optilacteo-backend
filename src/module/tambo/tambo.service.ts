import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { EstadoProveedor } from '../proveedores/enums/estado-proveedor.enum';
import { CreateTamboDto } from './dto/create-tambo.dto';
import { UpdateTamboDto } from './dto/update-tambo.dto';
import { TamboResponseDto } from './dto/tambo-response.dto';
import { TamboMapper } from './mappers/tambo.mapper';
import type { ITamboRepository } from './repository/tambo-interface.repository';
import { TAMBO_REPOSITORY } from './repository/tambo-interface.repository';
import type { TenantContext } from '../../common/types/tenant-context.type';

@Injectable()
export class TamboService {
  constructor(
    @Inject(TAMBO_REPOSITORY)
    private readonly tamboRepository: ITamboRepository,
    // Igual que en LoteService: Proveedor se inyecta directo (no tiene
    // repositorio propio con interfaz), para validar existencia/estado.
    @InjectRepository(Proveedor)
    private readonly proveedorRepository: Repository<Proveedor>,
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
    dto: CreateTamboDto,
    tenant: TenantContext,
  ): Promise<TamboResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);

    const proveedor = await this.proveedorRepository.findOne({
      where: { id: dto.proveedorId, empresaId },
    });
    if (!proveedor) {
      throw new NotFoundException(
        `El proveedor ${dto.proveedorId} no existe o no pertenece a la empresa`,
      );
    }
    if (proveedor.estado !== EstadoProveedor.ACTIVA) {
      throw new BadRequestException(
        `El proveedor "${proveedor.razonSocial}" no está activo (estado: ${proveedor.estado}) y no puede tener tambos nuevos asociados.`,
      );
    }

    const tambo = this.tamboRepository.create({
      nombre: dto.nombre,
      ubicacion: dto.ubicacion ?? null,
      proveedorId: dto.proveedorId,
      empresaId,
      activo: true,
    });

    const saved = await this.tamboRepository.save(tambo);
    return TamboMapper.toResponseDto(saved);
  }

  async findAll(tenant: TenantContext): Promise<TamboResponseDto[]> {
    const empresaId = this.resolveEmpresaId(tenant);
    const tambos = await this.tamboRepository.findAllByEmpresa(empresaId);
    return TamboMapper.toResponseDtoList(tambos);
  }

  // Usado por el combo encadenado del formulario de carga de lote:
  // GET /tambos?proveedorId=xxx
  async findByProveedor(
    proveedorId: number,
    tenant: TenantContext,
  ): Promise<TamboResponseDto[]> {
    const empresaId = this.resolveEmpresaId(tenant);

    const proveedor = await this.proveedorRepository.findOne({
      where: { id: proveedorId, empresaId },
    });
    if (!proveedor) {
      throw new NotFoundException(
        `El proveedor ${proveedorId} no existe o no pertenece a la empresa`,
      );
    }

    const tambos = await this.tamboRepository.findByProveedor(
      proveedorId,
      empresaId,
    );
    return TamboMapper.toResponseDtoList(tambos);
  }

  async findOne(id: number, tenant: TenantContext): Promise<TamboResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);
    const tambo = await this.tamboRepository.findById(id, empresaId);
    if (!tambo) {
      throw new NotFoundException(`Tambo ${id} no encontrado`);
    }
    return TamboMapper.toResponseDto(tambo);
  }

  async update(
    id: number,
    dto: UpdateTamboDto,
    tenant: TenantContext,
  ): Promise<TamboResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);
    const tambo = await this.tamboRepository.findById(id, empresaId);
    if (!tambo) {
      throw new NotFoundException(`Tambo ${id} no encontrado`);
    }

    // Nota: `activo` a propósito no se toca acá. Ver DTO — el estado
    // se maneja por remove()/activar(), no por este update genérico.
    if (dto.nombre !== undefined) tambo.nombre = dto.nombre;
    if (dto.ubicacion !== undefined) tambo.ubicacion = dto.ubicacion;

    const saved = await this.tamboRepository.save(tambo);
    return TamboMapper.toResponseDto(saved);
  }

  // Baja lógica (soft delete). Nunca se borra físicamente porque puede
  // estar referenciado por lotes ya registrados (trazabilidad histórica).
  async remove(id: number, tenant: TenantContext): Promise<TamboResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);
    const tambo = await this.tamboRepository.findById(id, empresaId);
    if (!tambo) {
      throw new NotFoundException(`Tambo ${id} no encontrado`);
    }
    if (!tambo.activo) {
      throw new BadRequestException(
        `El tambo "${tambo.nombre}" ya está dado de baja`,
      );
    }

    tambo.activo = false;
    const saved = await this.tamboRepository.save(tambo);
    return TamboMapper.toResponseDto(saved);
  }

  // Reactivación explícita de un tambo dado de baja.
  async activar(id: number, tenant: TenantContext): Promise<TamboResponseDto> {
    const empresaId = this.resolveEmpresaId(tenant);
    const tambo = await this.tamboRepository.findById(id, empresaId);
    if (!tambo) {
      throw new NotFoundException(`Tambo ${id} no encontrado`);
    }
    if (tambo.activo) {
      throw new BadRequestException(`El tambo "${tambo.nombre}" ya está activo`);
    }

    // No tiene sentido reactivar un tambo si su proveedor sigue dado de
    // baja — quedaría un tambo activo "colgado" de un proveedor inactivo.
    const proveedor = await this.proveedorRepository.findOne({
      where: { id: tambo.proveedorId, empresaId },
    });
    if (!proveedor || proveedor.estado !== EstadoProveedor.ACTIVA) {
      throw new BadRequestException(
        `No se puede reactivar el tambo "${tambo.nombre}" porque su proveedor no está activo`,
      );
    }

    tambo.activo = true;
    const saved = await this.tamboRepository.save(tambo);
    return TamboMapper.toResponseDto(saved);
  }
}