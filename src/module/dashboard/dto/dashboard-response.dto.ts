import { GranularidadHistorico } from './dashboard-historico.dto';

export type Tendencia = 'sube' | 'baja' | 'igual';

export class MetricaDto {
  valor!: number;
  valorAnterior!: number;
  tendencia!: Tendencia;
  variacion!: number; // valor - valorAnterior
}

export class LineaCalidadDto {
  recepcion!: number;
  clasificacion!: number;
  noAptos!: number;
  aptos!: number;
  totalLotesSistema!: number;
}

export class DashboardResponseDto {
  granularidad!: GranularidadHistorico;
  lotesProcesados!: MetricaDto;
  alertasActivas!: MetricaDto;
  parametrosCriticos!: MetricaDto;
  lineaCalidad!: LineaCalidadDto;
  actualizadoEn!: Date;
}
