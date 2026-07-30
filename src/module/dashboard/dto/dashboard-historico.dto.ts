export class PuntoHistoricoDto {
  fecha!: string; // 'YYYY-MM-DD'
  lotesProcesados!: number;
}

export class DashboardHistoricoDto {
  dias!: number;
  puntos!: PuntoHistoricoDto[];
}