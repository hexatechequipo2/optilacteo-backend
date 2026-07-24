import { Sensor } from '../../sensor/entities/sensor.entity';

export interface ISensorInactividadRepository {
  // Sensores activos, asociados HOY a un lote en_proceso, cuya última
  // lectura es anterior a "cutoff" (o nunca reportaron). Cruza todas las
  // empresas a propósito: lo llama un cron, no hay TenantContext de un
  // request para acotarlo.
  findSensoresInactivos(cutoff: Date): Promise<Sensor[]>;
}

export const SENSOR_INACTIVIDAD_REPOSITORY = 'ISensorInactividadRepository';
