import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { RecomendacionResponseDto } from '../../ml/dto/recomendacion-response.dto';
import { UnidadCantidad } from '../enums/unidad-cantidad.enum';

export class LoteConsumoParametroResponseDto {
  @ApiProperty({ enum: Parametro })
  parametro!: Parametro;

  @ApiProperty()
  valor!: number;
}

export class LoteConsumoResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  loteIngresoId!: number;

  @ApiProperty()
  loteProduccionId!: number;

  @ApiProperty()
  loteProduccionCodigo!: string;

  @ApiProperty()
  cantidad!: number;

  // HU-51: unidad de `cantidad`, heredada del lote de ingreso (no se
  // duplica en la entity LoteConsumo, se deriva del lote al mapear).
  @ApiPropertyOptional({ enum: UnidadCantidad, nullable: true })
  unidadCantidad?: UnidadCantidad | null;

  @ApiProperty()
  usuarioId!: number;

  @ApiProperty({ type: [LoteConsumoParametroResponseDto] })
  parametros!: LoteConsumoParametroResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional({ type: RecomendacionResponseDto, nullable: true })
  recomendacion?: RecomendacionResponseDto | null;
}

export class LoteProduccionResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  codigo!: string;

  @ApiProperty()
  createdAt!: Date;
}