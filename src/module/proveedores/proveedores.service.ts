import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PROVEEDOR_REPOSITORY, type IProveedorRepository } from './repository/proveedor-interface.repository';
import { ProveedorMapper } from './mappers/proveedor.mapper';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { ProveedorResponseDto } from './dto/proveedor-response.dto';

@Injectable()
export class ProveedoresService {
  constructor(
    @Inject(PROVEEDOR_REPOSITORY)
    private readonly proveedorRepository: IProveedorRepository,
    private readonly mapper: ProveedorMapper,
  ) {}

  async findAll(): Promise<ProveedorResponseDto[]> {
    const proveedores = await this.proveedorRepository.findAll();
    return this.mapper.toResponseDtoList(proveedores);
  }

  async findOne(id: number): Promise<ProveedorResponseDto> {
    const proveedor = await this.proveedorRepository.findById(id);
    if (!proveedor) {
      throw new NotFoundException(`Proveedor con id "${id}" no encontrado`);
    }
    return this.mapper.toResponseDto(proveedor);
  }

  async create(dto: CreateProveedorDto): Promise<ProveedorResponseDto> {
    const existing = await this.proveedorRepository.findByCuit(dto.cuit);
    if (existing) {
      throw new ConflictException(
        `Ya existe un proveedor registrado con el CUIT ${dto.cuit}`,
      );
    }
    const entity = this.mapper.toEntity(dto);
    const saved = await this.proveedorRepository.save(entity);
    return this.mapper.toResponseDto(saved);
  }

  async update(id: number, dto: UpdateProveedorDto): Promise<ProveedorResponseDto> {
    const proveedor = await this.proveedorRepository.findById(id);
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
    const updated = this.mapper.applyUpdate(proveedor, dto);
    const saved = await this.proveedorRepository.update(updated);
    return this.mapper.toResponseDto(saved);
  }

  async remove(id: number): Promise<void> {
    const proveedor = await this.proveedorRepository.findById(id);
    if (!proveedor) {
      throw new NotFoundException(`Proveedor con id "${id}" no encontrado`);
    }
    await this.proveedorRepository.delete(id);
  }
}