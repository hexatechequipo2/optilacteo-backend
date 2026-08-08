export enum GranularidadHistorico {
  DIA = 'dia',
  SEMANA = 'semana',
  MES = 'mes',
}

export class PuntoHistoricoDto {
  fecha!: string; // inicio del período: YYYY-MM-DD (dia/semana) o YYYY-MM (mes)
  lotesProcesados!: number;
}

export class DashboardHistoricoDto {
  granularidad!: GranularidadHistorico;
  cantidad!: number;
  puntos!: PuntoHistoricoDto[];
}