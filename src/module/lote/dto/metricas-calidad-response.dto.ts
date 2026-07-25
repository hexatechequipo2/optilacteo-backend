import { MetricaParametroResponseDto } from './metrica-parametro-response.dto';

// HU-18 (AC6): 'enProceso: false' es la señal explícita de "no hay lote en
// proceso" que la pantalla necesita para no mostrar una grilla vacía o un
// error genérico. Cuando es true, loteId y parametros siempre vienen.
export class MetricasCalidadResponseDto {
  enProceso!: boolean;
  loteId?: number;
  parametros?: MetricaParametroResponseDto[];
}