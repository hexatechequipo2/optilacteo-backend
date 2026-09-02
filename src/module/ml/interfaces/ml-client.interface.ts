import { Parametro } from '../../config-parametro/enums/parametro.enum';

export const ML_CLIENT = Symbol('ML_CLIENT');

export interface LoteFeatures {
  empresaId: number;
  parametros: Partial<Record<Parametro, number>>;
}

export interface RecomendacionDestinoResult {
  status: 'ok' | 'insufficient_data';
  // Nombre del destino productivo tal como lo devuelve el microservicio ML
  // (ej. "manteca"), no un id: MlService lo resuelve contra
  // destinos_productivos por nombre+empresa.
  destinoRecomendado?: string;
  confianza?: number;
}

export interface IMlClient {
  predecirDestino(features: LoteFeatures): Promise<RecomendacionDestinoResult>;
}
