import { ApiProperty } from '@nestjs/swagger';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { EstadoMedicion } from '../../lectura-sensor/enums/estado-medicion.enum';

export class MedicionManualItemResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ enum: Parametro })
  parametro!: Parametro;

  @ApiProperty()
  valor!: number;

  @ApiProperty({ enum: EstadoMedicion })
  estado!: EstadoMedicion;

  @ApiProperty()
  createdAt!: Date;
}

export class MedicionManualLoteResponseDto {
  @ApiProperty()
  loteId!: number;

  @ApiProperty({ enum: TipoMateriaPrima })
  tipoMateriaPrima!: TipoMateriaPrima;

  @ApiProperty()
  usuarioId!: number;

  @ApiProperty({ type: [MedicionManualItemResponseDto] })
  mediciones!: MedicionManualItemResponseDto[];
}

export class HistorialMedicionManualResponseDto {
  @ApiProperty({ type: [MedicionManualItemResponseDto] })
  data!: MedicionManualItemResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}