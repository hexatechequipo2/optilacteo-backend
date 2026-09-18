import {
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DestinoProductivo } from './entities/destino-productivo.entity';
import { DestinoProductivoResponseDto } from './dto/destino-productivo-response.dto';
import { CreateDestinoProductivoDto } from './dto/create-destino-productivo.dto';

import type { TenantContext } from '../../common/types/tenant-context.type';

@Injectable()
export class DestinoProductivoService {
  constructor(
    @InjectRepository(DestinoProductivo)
    private readonly destinoProductivoRepo: Repository<DestinoProductivo>,
  ) {}

  // HU-49: catálogo de destinos productivos activos de la empresa.
  async findActivos(
    tenant: TenantContext,
  ): Promise<DestinoProductivoResponseDto[]> {
    const destinos = await this.destinoProductivoRepo.find({
      where: {
        empresaId: tenant.empresaId!,
        activo: true,
      },
      order: { nombre: 'ASC' },
    });

    return destinos.map((destino) => ({
      id: destino.id,
      nombre: destino.nombre,
    }));
  }

  // Crear destino productivo para la empresa del tenant.
  async create(
    tenant: TenantContext,
    dto: CreateDestinoProductivoDto,
  ): Promise<DestinoProductivoResponseDto> {
    const nombre = dto.nombre.trim();

    const existente = await this.destinoProductivoRepo.findOne({
      where: {
        empresaId: tenant.empresaId!,
        nombre,
      },
    });

    if (existente) {
      throw new ConflictException(
        'Ya existe un destino productivo con ese nombre para esta empresa',
      );
    }

    const destino = this.destinoProductivoRepo.create({
      empresaId: tenant.empresaId!,
      nombre,
      activo: true,
    });

    const guardado = await this.destinoProductivoRepo.save(destino);

    return {
      id: guardado.id,
      nombre: guardado.nombre,
    };
  }
}