import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorLoteHistorial } from '../entities/sensor-lote-historial.entity';
import { ISensorLoteHistorialRepository } from './sensor-lote-historial.repository.interface';

@Injectable()
export class SensorLoteHistorialRepository implements ISensorLoteHistorialRepository {
  constructor(
    @InjectRepository(SensorLoteHistorial)
    private readonly repo: Repository<SensorLoteHistorial>,
  ) {}

  create(registro: SensorLoteHistorial): Promise<SensorLoteHistorial> {
    return this.repo.save(registro);
  }

  findBySensor(sensorId: number, empresaId: number): Promise<SensorLoteHistorial[]> {
    return this.repo.find({
      where: { sensorId, empresaId },
      order: { fecha: 'DESC' },
    });
  }

  findByLote(loteId: number, empresaId: number): Promise<SensorLoteHistorial[]> {
    return this.repo
      .createQueryBuilder('h')
      .where('h.empresaId = :empresaId', { empresaId })
      .andWhere('(h.loteIdNuevo = :loteId OR h.loteIdAnterior = :loteId)', { loteId })
      .orderBy('h.fecha', 'DESC')
      .getMany();
  }

  findUltimoPorSensor(sensorId: number, empresaId: number): Promise<SensorLoteHistorial | null> {
    return this.repo.findOne({
      where: { sensorId, empresaId },
      order: { fecha: 'DESC' },
    });
  }

  // Usa DISTINCT ON de Postgres para traer la última fila de cada sensor en un solo query.
  findUltimosPorSensores(sensorIds: number[], empresaId: number): Promise<SensorLoteHistorial[]> {
    if (sensorIds.length === 0) return Promise.resolve([]);

    return this.repo
      .createQueryBuilder('h')
      .distinctOn(['h.sensorId'])
      .where('h.empresaId = :empresaId', { empresaId })
      .andWhere('h.sensorId IN (:...sensorIds)', { sensorIds })
      .orderBy('h.sensorId')
      .addOrderBy('h.fecha', 'DESC')
      .getMany();
  }

  async findSensoresActualesDeLote(loteId: number, empresaId: number): Promise<number[]> {
    // Última fila de cada sensor (DISTINCT ON), filtrando las que apuntan a este lote.
    const raw = await this.repo.manager.query(
      `
      SELECT DISTINCT ON ("sensorId") "sensorId", "loteIdNuevo"
      FROM sensor_lote_historial
      WHERE "empresaId" = $1
      ORDER BY "sensorId", "fecha" DESC
      `,
      [empresaId],
    );

    return raw
      .filter((r: any) => r.loteIdNuevo === loteId)
      .map((r: any) => r.sensorId);
  }
}