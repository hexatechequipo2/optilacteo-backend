import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorLectura } from '../entities/sensor-lectura.entity';
import {
  HistorialLecturaFiltro,
  HistorialLecturaFiltroPaginado,
  ISensorLecturaRepository,
} from './sensor-lectura.repository.interface';

@Injectable()
export class SensorLecturaRepository implements ISensorLecturaRepository {
  constructor(
    @InjectRepository(SensorLectura)
    private readonly repo: Repository<SensorLectura>,
  ) {}

  create(lectura: SensorLectura): Promise<SensorLectura> {
    return this.repo.save(lectura);
  }

  findHistorial(
    filtro: HistorialLecturaFiltroPaginado,
    empresaId: number,
  ): Promise<[SensorLectura[], number]> {
    const qb = this.construirQuery(filtro, empresaId);
    return qb
      .orderBy('lectura.timestampLectura', 'DESC')
      .skip((filtro.page - 1) * filtro.limit)
      .take(filtro.limit)
      .getManyAndCount();
  }

  findHistorialCompleto(
    filtro: HistorialLecturaFiltro,
    empresaId: number,
  ): Promise<SensorLectura[]> {
    return this.construirQuery(filtro, empresaId)
      .orderBy('lectura.timestampLectura', 'DESC')
      .getMany();
  }

  private construirQuery(filtro: HistorialLecturaFiltro, empresaId: number) {
    const qb = this.repo
      .createQueryBuilder('lectura')
      .innerJoinAndSelect('lectura.sensor', 'sensor')
      .innerJoinAndSelect('lectura.lote', 'lote')
      .where('lectura.empresaId = :empresaId', { empresaId });

    if (filtro.loteId != null) {
      qb.andWhere('lectura.loteId = :loteId', { loteId: filtro.loteId });
    }
    if (filtro.fechaInicio) {
      qb.andWhere('lectura.timestampLectura >= :fechaInicio', {
        fechaInicio: filtro.fechaInicio,
      });
    }
    if (filtro.fechaFin) {
      qb.andWhere('lectura.timestampLectura <= :fechaFin', {
        fechaFin: filtro.fechaFin,
      });
    }
    return qb;
  }
}
