import { ApiProperty } from '@nestjs/swagger';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

export enum GranularidadAgregacion {
  DIA = 'dia',
  SEMANA = 'semana',
  MES = 'mes',
}

export class PuntoIndicadorDto {
  @ApiProperty({ description: 'Fecha ISO del período (ya truncado según granularidad)' })
  fecha!: string;

  @ApiProperty({ nullable: true, description: 'null si no hubo mediciones en ese período' })
  valor!: number | null;
}

export class SerieIndicadorDto {
  @ApiProperty({ enum: Parametro })
  parametro!: Parametro;

  @ApiProperty({ type: [PuntoIndicadorDto] })
  puntos!: PuntoIndicadorDto[];
}

export class EvolucionIndicadoresResponseDto {
  @ApiProperty({ enum: GranularidadAgregacion })
  granularidadAplicada!: GranularidadAgregacion;

  @ApiProperty()
  desde!: string;

  @ApiProperty()
  hasta!: string;

  @ApiProperty({ type: [SerieIndicadorDto] })
  series!: SerieIndicadorDto[];
}