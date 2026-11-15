export type NivelParametro = 'normal' | 'alerta' | 'critico';

export type OrigenValor = 'sensor' | 'manual' | 'inicial';

// Resultado de evaluar un parámetro contra la configuración vigente (HU-76).
export interface ParametroEvaluado {
  parametro: string;
  valor: number;
  nivel: NivelParametro;
  origen: OrigenValor;
  // true si sensor y medición manual difieren más que la tolerancia.
  enRevisionPorConflicto: boolean;
  umbralMin: number;
  umbralMax: number;
  umbralAlertaMin: number;
  umbralAlertaMax: number;
}

// Las filas históricas anteriores a HU-76 solo tienen { parametro, valor }.
export type ParametroHistorico = Pick<ParametroEvaluado, 'parametro' | 'valor'> &
  Partial<ParametroEvaluado>;