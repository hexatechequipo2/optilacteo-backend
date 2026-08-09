import { SensorLectura } from '../entities/sensor-lectura.entity';

export interface HistorialLecturaFiltro {
  loteId?: number;
  fechaInicio?: Date;
  fechaFin?: Date;
}

export interface HistorialLecturaFiltroPaginado extends HistorialLecturaFiltro {
  page: number;
  limit: number;
}

export interface ISensorLecturaRepository {
  create(lectura: SensorLectura): Promise<SensorLectura>;

  // HU-19: historial filtrado, paginado, con joins a sensor y lote para
  // no golpear N+1 al mapear la respuesta.
  findHistorial(
    filtro: HistorialLecturaFiltroPaginado,
    empresaId: number,
  ): Promise<[SensorLectura[], number]>;

  // Mismo filtro sin paginar, para exportación completa.
  findHistorialCompleto(
    filtro: HistorialLecturaFiltro,
    empresaId: number,
  ): Promise<SensorLectura[]>;
}

export const SENSOR_LECTURA_REPOSITORY = 'ISensorLecturaRepository';
