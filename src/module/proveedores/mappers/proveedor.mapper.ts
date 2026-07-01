import { Injectable } from '@nestjs/common';
import { Proveedor } from '../entities/proveedor.entity';
import { CreateProveedorDto } from '../dto/create-proveedor.dto';
import { UpdateProveedorDto } from '../dto/update-proveedor.dto';
import { ProveedorResponseDto } from '../dto/proveedor-response.dto';
import { EstadoProveedor } from '../enums/estado-proveedor.enum';

@Injectable()
export class ProveedorMapper {
  // empresaId se recibe resuelto por el service (ProveedoresService.resolveEmpresaId),
  // no se toma de dto.empresaId directamente: para roles no-admin ese valor
  // se ignora y se fuerza desde el JWT, para no permitir asignar el proveedor
  // a una empresa ajena.
  toEntity(dto: CreateProveedorDto, empresaId: number): Proveedor {
    const entity = new Proveedor();
    entity.razonSocial = dto.razonSocial;
    entity.cuit = dto.cuit;
    entity.telefono = dto.telefono ?? null;
    entity.emailContacto = dto.emailContacto ?? null;
    entity.tipo = dto.tipo;
    entity.empresaId = empresaId;
    entity.provincia = dto.provincia ?? null;
    entity.localidad = dto.localidad ?? null;
    entity.capacidad = dto.capacidad ?? null;
    entity.estado = dto.estado ?? EstadoProveedor.ACTIVA;
    return entity;
  }

  applyUpdate(entity: Proveedor, dto: UpdateProveedorDto, empresaId?: number): Proveedor {
    if (dto.razonSocial !== undefined) entity.razonSocial = dto.razonSocial;
    if (dto.cuit !== undefined) entity.cuit = dto.cuit;
    if (dto.telefono !== undefined) entity.telefono = dto.telefono ?? null;
    if (dto.emailContacto !== undefined) entity.emailContacto = dto.emailContacto ?? null;
    if (dto.tipo !== undefined) entity.tipo = dto.tipo;
    if (empresaId !== undefined) entity.empresaId = empresaId;
    if (dto.provincia !== undefined) entity.provincia = dto.provincia ?? null;
    if (dto.localidad !== undefined) entity.localidad = dto.localidad ?? null;
    if (dto.capacidad !== undefined) entity.capacidad = dto.capacidad ?? null;
    if (dto.estado !== undefined) entity.estado = dto.estado;
    return entity;
  }

  toResponseDto(entity: Proveedor): ProveedorResponseDto {
    return {
      id: entity.id,
      razonSocial: entity.razonSocial,
      cuit: entity.cuit,
      telefono: entity.telefono,
      emailContacto: entity.emailContacto,
      tipo: entity.tipo,
      empresaId: entity.empresaId,
      provincia: entity.provincia,
      localidad: entity.localidad,
      capacidad: entity.capacidad,
      estado: entity.estado,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  toResponseDtoList(entities: Proveedor[]): ProveedorResponseDto[] {
    return entities.map((e) => this.toResponseDto(e));
  }
}