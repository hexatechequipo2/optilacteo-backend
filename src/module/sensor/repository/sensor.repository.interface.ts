import { Sensor } from '../entities/sensor.entity';
import { SensorFilterQueryDto } from '../dto/sensor-filter-query.dto';

export interface ISensorRepository {
  create(sensor: Sensor): Promise<Sensor>;
  findAll(filter: SensorFilterQueryDto, empresaId: number): Promise<Sensor[]>;
  findOne(id: number, empresaId: number): Promise<Sensor | null>;
  findByNombre(nombre: string, empresaId: number): Promise<Sensor | null>;
  save(sensor: Sensor): Promise<Sensor>;
  remove(sensor: Sensor): Promise<void>;
}

export const SENSOR_REPOSITORY = 'ISensorRepository';