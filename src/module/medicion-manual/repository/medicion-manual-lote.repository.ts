// medicion-manual/repository/medicion-manual-lote.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicionManualLote } from '../entities/medicion-manual-lote.entity';
import {
  HistorialMedicionManualFiltro,
  IMedicionManualLoteRepository,
} from './medicion-manual-lote.repository.interface';

@Injectable()
export class MedicionManualLoteRepository implements IMedicionManualLoteRepository {
  constructor(
    @InjectRepository(MedicionManualLote)
    private readonly repo: Repository<MedicionManualLote>,
  ) {}

  create(
    mediciones: Partial<MedicionManualLote>[],
  ): Promise<MedicionManualLote[]> {
    return this.repo.save(mediciones);
  }

  // Mismo patrón que SensorLecturaRepository.findHistorial (HU-19): filtro
  // por empresaId + loteId + rango de fechas, paginado.
  findByLotePaginado(
    filtro: HistorialMedicionManualFiltro,
    empresaId: number,
  ): Promise<[MedicionManualLote[], number]> {
    const qb = this.repo
      .createQueryBuilder('medicion')
      .where('medicion.empresaId = :empresaId', { empresaId })
      .andWhere('medicion.loteId = :loteId', { loteId: filtro.loteId });

    if (filtro.fechaInicio) {
      qb.andWhere('medicion.createdAt >= :fechaInicio', {
        fechaInicio: filtro.fechaInicio,
      });
    }
    if (filtro.fechaFin) {
      qb.andWhere('medicion.createdAt <= :fechaFin', {
        fechaFin: filtro.fechaFin,
      });
    }

    return qb
      .orderBy('medicion.createdAt', 'DESC')
      .skip((filtro.page - 1) * filtro.limit)
      .take(filtro.limit)
      .getManyAndCount();
  }
}
