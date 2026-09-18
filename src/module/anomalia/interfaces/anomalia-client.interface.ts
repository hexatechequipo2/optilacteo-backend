import { Parametro } from '../../config-parametro/enums/parametro.enum';

export const ANOMALIA_CLIENT = 'ANOMALIA_CLIENT';

export interface DetectarAnomaliaParams {
  empresaId: number;
  parametro: Parametro;
  valor: number;
  historicoReciente: number[];
}

export interface DetectarAnomaliaResultado {
  status: 'ok' | 'insufficient_data' | 'invalid_data';
  esAnomalia?: boolean;
  parametro?: string;
  tipoDesvio?: string;
  confianza?: number;
  modeloVersion?: string;
}

export interface IAnomaliaClient {
  detectar(params: DetectarAnomaliaParams): Promise<DetectarAnomaliaResultado>;
}