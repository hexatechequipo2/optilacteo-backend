import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { RecomendacionResponseDto } from '../../ml/dto/recomendacion-response.dto';

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

  @ApiProperty()
  usuarioId!: number;

  @ApiProperty({ type: [LoteConsumoParametroResponseDto] })
  parametros!: LoteConsumoParametroResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  // HU-49 AC1/AC3: solo se genera cuando este consumo trae parámetros
  // nuevos (2do consumo en adelante — el 1ro reutiliza los del alta del
  // lote y ya tiene su propia recomendación). Null si no aplica o si no
  // hay historial suficiente todavía.
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