import { LoteUbicacionHistorial } from '../entities/lote-ubicacion-historial.entity';

export interface ILoteUbicacionHistorialRepository {
  create(registro: LoteUbicacionHistorial): Promise<LoteUbicacionHistorial>;
  findUltimoPorLote(loteId: number, empresaId: number): Promise<LoteUbicacionHistorial | null>;
}

export const LOTE_UBICACION_HISTORIAL_REPOSITORY = 'ILoteUbicacionHistorialRepository';