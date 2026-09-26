import { ApiProperty } from '@nestjs/swagger';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { EstadoMedicion } from '../../lectura-sensor/enums/estado-medicion.enum';

export type OrigenLecturaSemaforo = 'SENSOR' | 'MANUAL';

export class SemaforoParametroDto {
  @ApiProperty({ enum: Parametro })
  parametro!: Parametro;

  @ApiProperty()
  valor!: number;

  @ApiProperty({ enum: EstadoMedicion })
  estado!: EstadoMedicion;

  @ApiProperty({ enum: ['SENSOR', 'MANUAL'] })
  origen!: OrigenLecturaSemaforo;

  @ApiProperty()
  timestamp!: Date;
}

export class SemaforoLoteResponseDto {
  @ApiProperty()
  loteId!: number;

  @ApiProperty()
  loteCodigo!: string;

  @ApiProperty({ type: [SemaforoParametroDto] })
  parametros!: SemaforoParametroDto[];
}