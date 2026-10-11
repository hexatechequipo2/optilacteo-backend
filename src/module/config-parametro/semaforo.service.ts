import { Injectable } from '@nestjs/common';
import { ConfiguracionParametro } from './entities/config-parametro.entity';
import { EstadoMedicion } from '../lectura-sensor/enums/estado-medicion.enum';

type UmbralesParametro = Pick<
  ConfiguracionParametro,
  'umbralMin' | 'umbralMax' | 'umbralAlertaMin' | 'umbralAlertaMax'
>;

// HU-40: única fuente de verdad para el cálculo de semáforo
// (verde/amarillo/rojo). La consumen lectura-sensor, medicion-manual
// y dashboard, para no duplicar la lógica en cada módulo.
@Injectable()
export class SemaforoService {
  calcularEstado(
    valor: number,
    config: UmbralesParametro | undefined,
  ): EstadoMedicion {
    if (!config) {
      return EstadoMedicion.SIN_UMBRAL_CONFIGURADO;
    }

    const umbralMin = Number(config.umbralMin);
    const umbralMax = Number(config.umbralMax);
    const umbralAlertaMin = Number(config.umbralAlertaMin);
    const umbralAlertaMax = Number(config.umbralAlertaMax);

    if (valor < umbralAlertaMin || valor > umbralAlertaMax) {
      return EstadoMedicion.FUERA_DE_RANGO; // rojo
    }

    if (valor < umbralMin || valor > umbralMax) {
      return EstadoMedicion.EN_LIMITE; // amarillo
    }

    return EstadoMedicion.NORMAL; // verde
  }
}