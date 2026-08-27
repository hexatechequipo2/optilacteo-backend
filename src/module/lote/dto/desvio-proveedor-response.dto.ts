import { ApiProperty } from '@nestjs/swagger';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

export class DesvioParametroDto {
  @ApiProperty({ enum: Parametro })
  parametro!: Parametro;

  @ApiProperty()
  valorComprometido!: number;

  @ApiProperty()
  valorReal!: number;

  @ApiProperty({
    description: 'Porcentaje de desvío (positivo = por encima de lo comprometido)',
  })
  desvioPorcentaje!: number;
}

export class DesvioProveedorResponseDto {
  @ApiProperty()
  loteId!: number;

  @ApiProperty()
  codigo!: string;

  @ApiProperty()
  fechaIngreso!: Date;

  @ApiProperty({ nullable: true })
  cantidadComprometidaKg!: number | null;

  @ApiProperty({ nullable: true })
  cantidadReal!: number | null;

  @ApiProperty({ nullable: true })
  desvioCantidadPorcentaje!: number | null;

  @ApiProperty({ type: [DesvioParametroDto] })
  parametros!: DesvioParametroDto[];
}