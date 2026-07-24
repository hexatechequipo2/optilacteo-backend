import { SensorLectura } from '../entities/sensor-lectura.entity';

export interface ISensorLecturaRepository {
  create(lectura: SensorLectura): Promise<SensorLectura>;
}

export const SENSOR_LECTURA_REPOSITORY = 'ISensorLecturaRepository';
