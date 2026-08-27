import { ApiProperty } from '@nestjs/swagger';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

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
}

export class LoteProduccionResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  codigo!: string;

  @ApiProperty()
  createdAt!: Date;
}