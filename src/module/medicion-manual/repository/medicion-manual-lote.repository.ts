// medicion-manual/repository/medicion-manual-lote.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicionManualLote } from '../entities/medicion-manual-lote.entity';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
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

  // ============================================================
  // HU-50
  // ============================================================

  async findUltimosValores(
    loteId: number,
    parametro: Parametro,
    empresaId: number,
    limit: number,
  ): Promise<number[]> {
    const filas = await this.repo
      .createQueryBuilder('medicion')
      .where('medicion.empresaId = :empresaId', { empresaId })
      .andWhere('medicion.loteId = :loteId', { loteId })
      .andWhere('medicion.parametro = :parametro', { parametro })
      .orderBy('medicion.createdAt', 'DESC')
      .take(limit)
      .select('medicion.valor', 'valor')
      .getRawMany<{ valor: string }>();

    // Se invierte para quedar en orden cronológico ascendente — el
    // microservicio ML espera el histórico en ese orden para poder
    // detectar tendencia (diffs consecutivos).
    return filas.map((f) => Number(f.valor)).reverse();
  }
}