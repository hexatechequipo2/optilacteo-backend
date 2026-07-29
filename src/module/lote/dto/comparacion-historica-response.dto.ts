export class ParametroComparacionDto {
  parametro!: string;
  valorLote!: number;
  promedioHistorico!: number;
  desviacionPorcentual!: number;
  superaDesvioSignificativo!: boolean;
}

export class ComparacionHistoricaResponseDto {
  loteId!: number;
  cantidadLotesHistoricosUtilizados!: number;
  cantidadLotesHistoricosConfigurada!: number;
  desvioSignificativoPorcentaje!: number;
  parametros!: ParametroComparacionDto[];
}