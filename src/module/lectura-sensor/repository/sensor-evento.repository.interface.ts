import { SensorEvento } from '../entities/sensor-evento.entity';

export interface ISensorEventoRepository {
  create(evento: SensorEvento): Promise<SensorEvento>;
}

export const SENSOR_EVENTO_REPOSITORY = 'ISensorEventoRepository';
