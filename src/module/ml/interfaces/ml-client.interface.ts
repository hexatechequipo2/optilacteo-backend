import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { DestinoLote } from '../../lote/enums/destino-lote.enum';

export const ML_CLIENT = Symbol('ML_CLIENT');

export interface LoteFeatures {
  empresaId: number;
  parametros: Partial<Record<Parametro, number>>;
}

export interface RecomendacionDestinoResult {
  status: 'ok' | 'insufficient_data';
  destinoRecomendado?: DestinoLote;
  confianza?: number;
}

export interface IMlClient {
  predecirDestino(features: LoteFeatures): Promise<RecomendacionDestinoResult>;
}