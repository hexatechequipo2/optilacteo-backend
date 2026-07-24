import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Sensor } from '../../sensor/entities/sensor.entity';
import { EstadoSensor } from '../../sensor/enums/estado-sensor.enum';
import { EstadoLote } from '../../lote/enums/estado-lote.enum';
import { ISensorInactividadRepository } from './sensor-inactividad.repository.interface';

@Injectable()
export class SensorInactividadRepository implements ISensorInactividadRepository {
  constructor(
    @InjectRepository(Sensor)
    private readonly repo: Repository<Sensor>,
  ) {}

  async findSensoresInactivos(cutoff: Date): Promise<Sensor[]> {
    // Última fila de sensor_lote_historial por sensor (mismo patrón DISTINCT
    // ON que SensorLoteHistorialRepository.findSensoresActualesDeLote), unida
    // al lote para quedarnos solo con sensores "en uso" en una recepción activa.
    const rows: { id: number }[] = await this.repo.manager.query(
      `
      SELECT s.id FROM sensores s
      INNER JOIN (
        SELECT DISTINCT ON ("sensorId") "sensorId", "loteIdNuevo"
        FROM sensor_lote_historial
        ORDER BY "sensorId", "fecha" DESC
      ) h ON h."sensorId" = s.id
      INNER JOIN lotes l ON l.id = h."loteIdNuevo"
      WHERE s.estado = $1
        AND l.estado = $2
        AND (s."ultimaLectura" IS NULL OR s."ultimaLectura" < $3)
      `,
      [EstadoSensor.ACTIVO, EstadoLote.EN_PROCESO, cutoff],
    );

    if (rows.length === 0) return [];
    return this.repo.findBy({ id: In(rows.map((r) => r.id)) });
  }
}
