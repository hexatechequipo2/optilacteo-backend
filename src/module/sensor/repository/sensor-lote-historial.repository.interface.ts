import { SensorLoteHistorial } from '../entities/sensor-lote-historial.entity';

export interface ISensorLoteHistorialRepository {
  create(registro: SensorLoteHistorial): Promise<SensorLoteHistorial>;
  findBySensor(sensorId: number, empresaId: number): Promise<SensorLoteHistorial[]>;
  findByLote(loteId: number, empresaId: number): Promise<SensorLoteHistorial[]>;
  // Deriva el estado actual: última fila por sensor.
  findUltimoPorSensor(sensorId: number, empresaId: number): Promise<SensorLoteHistorial | null>;
  findUltimosPorSensores(sensorIds: number[], empresaId: number): Promise<SensorLoteHistorial[]>;
  // ¿Qué sensores están asociados HOY a este lote? (última fila de cada sensor apunta a este lote)
  findSensoresActualesDeLote(loteId: number, empresaId: number): Promise<number[]>;
}

export const SENSOR_LOTE_HISTORIAL_REPOSITORY = 'ISensorLoteHistorialRepository';