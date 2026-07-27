// medicion-manual/repository/medicion-manual-lote.repository.interface.ts
import { MedicionManualLote } from '../entities/medicion-manual-lote.entity';

export const MEDICION_MANUAL_LOTE_REPOSITORY = 'MEDICION_MANUAL_LOTE_REPOSITORY';

export interface HistorialMedicionManualFiltro {
  loteId: number;
  fechaInicio?: Date;
  fechaFin?: Date;
  page: number;
  limit: number;
}

export interface IMedicionManualLoteRepository {
  create(mediciones: Partial<MedicionManualLote>[]): Promise<MedicionManualLote[]>;
  findByLotePaginado(
    filtro: HistorialMedicionManualFiltro,
    empresaId: number,
  ): Promise<[MedicionManualLote[], number]>;
}