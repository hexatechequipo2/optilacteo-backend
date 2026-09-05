import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DestinoProductivo } from './entities/destino-productivo.entity';
import { DestinoProductivoResponseDto } from './dto/destino-productivo-response.dto';

import type { TenantContext } from '../../common/types/tenant-context.type';

@Injectable()
export class DestinoProductivoService {
  constructor(
    @InjectRepository(DestinoProductivo)
    private readonly destinoProductivoRepo: Repository<DestinoProductivo>,
  ) {}

  // HU-49: catálogo de destinos productivos activos de la empresa, para el
  // selector de destino del frontend (hoy resuelto con un mock).
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
}
