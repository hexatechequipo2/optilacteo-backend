import { Sensor } from '../entities/sensor.entity';
import { SensorFilterQueryDto } from '../dto/sensor-filter-query.dto';
import { EstadoSensor } from '../enums/estado-sensor.enum';

export interface ISensorRepository {
  create(sensor: Sensor): Promise<Sensor>;
  findAll(filter: SensorFilterQueryDto, empresaId: number): Promise<Sensor[]>;
  findOne(id: number, empresaId: number): Promise<Sensor | null>;
  findByNombre(nombre: string, empresaId: number): Promise<Sensor | null>;
  save(sensor: Sensor): Promise<Sensor>;
  remove(sensor: Sensor): Promise<void>;
  setEstado(id: number, estado: EstadoSensor, empresaId: number): Promise<boolean>;
}

export const SENSOR_REPOSITORY = 'ISensorRepository';