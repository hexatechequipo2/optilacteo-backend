import { ApiProperty } from '@nestjs/swagger';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { UnidadCantidad } from '../enums/unidad-cantidad.enum';

export class DesvioParametroDto {
  @ApiProperty({ enum: Parametro })
  parametro!: Parametro;

  @ApiProperty()
  valorComprometido!: number;

  @ApiProperty()
  valorReal!: number;

  @ApiProperty({
    description:
      'Porcentaje de desvío (positivo = por encima de lo comprometido)',
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

  // HU-51: unidad real de `cantidadReal`. `cantidadComprometidaKg` es
  // siempre kilogramos (remito del proveedor); si esta unidad no es
  // 'kilogramos', el desvío NO se calcula (ver desvioCantidadPorcentaje).
  @ApiProperty({ enum: UnidadCantidad, nullable: true })
  unidadCantidadReal!: UnidadCantidad | null;

  @ApiProperty({
    nullable: true,
    description:
      'Null si cantidadReal no está en kilogramos (unidades no comparables sin conversión)',
  })
  desvioCantidadPorcentaje!: number | null;

  @ApiProperty({ type: [DesvioParametroDto] })
  parametros!: DesvioParametroDto[];
}