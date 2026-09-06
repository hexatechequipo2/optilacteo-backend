import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';

export const PREDICCION_CLIENT = 'PREDICCION_CLIENT';

export interface PredecirVolumenParams {
  empresaId: number;
  tipoMateriaPrima: TipoMateriaPrima;
  serieHistorica: { fecha: string; valor: number }[];
}

export interface DiaPrediccionResultado {
  fecha: string;
  minimo: number;
  esperado: number;
  maximo: number;
}

export interface PredecirVolumenResultado {
  status: 'ok' | 'insufficient_data';
  dias?: DiaPrediccionResultado[];
  modeloVersion?: string;
}

export interface IPrediccionClient {
  predecir(
    params: PredecirVolumenParams,
  ): Promise<PredecirVolumenResultado>;
}