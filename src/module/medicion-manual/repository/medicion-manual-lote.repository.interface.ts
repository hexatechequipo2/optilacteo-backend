// medicion-manual/repository/medicion-manual-lote.repository.interface.ts
import { MedicionManualLote } from '../entities/medicion-manual-lote.entity';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

export const MEDICION_MANUAL_LOTE_REPOSITORY =
  'MEDICION_MANUAL_LOTE_REPOSITORY';

export interface HistorialMedicionManualFiltro {
  loteId: number;
  fechaInicio?: Date;
  fechaFin?: Date;
  page: number;
  limit: number;
}

export interface IMedicionManualLoteRepository {
  create(
    mediciones: Partial<MedicionManualLote>[],
  ): Promise<MedicionManualLote[]>;
  findByLotePaginado(
    filtro: HistorialMedicionManualFiltro,
    empresaId: number,
  ): Promise<[MedicionManualLote[], number]>;

  /**
   * HU-50: últimos N valores de un lote+parámetro, más recientes primero
   * en la consulta pero devueltos en orden cronológico ascendente, para
   * pasarle contexto (historicoReciente) al microservicio ML y que pueda
   * clasificar el tipo de desvío de una anomalía detectada.
   */
  findUltimosValores(
    loteId: number,
    parametro: Parametro,
    empresaId: number,
    limit: number,
  ): Promise<number[]>;
}