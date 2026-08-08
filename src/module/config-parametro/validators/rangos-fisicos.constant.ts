import { Parametro } from '../enums/parametro.enum';

export const RANGOS_FISICOS: Record<Parametro, { min: number; max: number }> = {
  [Parametro.PH]: { min: 0, max: 14 },
  [Parametro.TEMPERATURA]: { min: -20, max: 100 },
  [Parametro.DENSIDAD]: { min: 0, max: 2 },
  [Parametro.GRASA]: { min: 0, max: 100 },
  [Parametro.PROTEINA]: { min: 0, max: 100 },
  [Parametro.ACIDEZ]: { min: 0, max: 50 },
  [Parametro.CONDUCTIVIDAD]: { min: 0, max: 30 },
};