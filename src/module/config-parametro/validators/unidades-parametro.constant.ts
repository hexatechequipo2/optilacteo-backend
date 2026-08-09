import { Parametro } from '../enums/parametro.enum';

// HU-18 (AC4): unidad de medida que se muestra junto a cada valor en la
// pantalla de monitoreo. Vive junto a RANGOS_FISICOS porque es la misma
// clase de dato: metadata fija por parámetro, no configurable por empresa.
export const UNIDAD_POR_PARAMETRO: Record<Parametro, string> = {
  [Parametro.PH]: 'pH',
  [Parametro.TEMPERATURA]: '°C',
  [Parametro.DENSIDAD]: 'g/mL',
  [Parametro.GRASA]: '%',
  [Parametro.PROTEINA]: '%',
  [Parametro.ACIDEZ]: '°D',
  [Parametro.CONDUCTIVIDAD]: 'mS/cm',
};
