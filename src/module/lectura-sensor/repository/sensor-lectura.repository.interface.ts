import { SensorLectura } from '../entities/sensor-lectura.entity';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

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

  /**
   * HU-50: últimos N valores de un lote+parámetro (join con sensor,
   * porque sensor_lecturas no tiene parametro propio), en orden
   * cronológico ascendente, para pasarle contexto (historicoReciente)
   * al microservicio ML y que pueda clasificar el tipo de desvío de una
   * anomalía detectada.
   */
  findUltimosValores(
    loteId: number,
    parametro: Parametro,
    empresaId: number,
    limit: number,
  ): Promise<number[]>;
}

export const SENSOR_LECTURA_REPOSITORY = 'ISensorLecturaRepository';