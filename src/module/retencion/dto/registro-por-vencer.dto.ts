export class RegistroPorVencerDto {
  entidad!: string;
  id!: number;
  createdAt!: Date;
  fechaVencimiento!: Date;
  diasRestantes!: number;
}

export class ProximosAVencerResponseDto {
  retencionMeses!: number;
  diasAvisoVencimiento!: number;
  total!: number;
  registros!: RegistroPorVencerDto[];
}