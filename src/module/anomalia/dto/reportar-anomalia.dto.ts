import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { TipoDesvioAnomalia } from '../../notificaciones/enums/tipo-desvio-anomalia.enum';

// HU-50: payload que envía el microservicio ML al detectar una anomalía
// en una corrida batch sobre las series históricas.
export class ReportarAnomaliaDto {
  @ApiProperty()
  @IsInt()
  empresaId!: number;

  @ApiProperty()
  @IsInt()
  loteId!: number;

  @ApiProperty({ enum: Parametro })
  @IsEnum(Parametro)
  parametro!: Parametro;

  @ApiProperty({ enum: TipoDesvioAnomalia })
  @IsEnum(TipoDesvioAnomalia)
  tipoDesvio!: TipoDesvioAnomalia;

  @ApiProperty({ description: 'Confianza del modelo, 0-100' })
  @IsNumber()
  @Min(0)
  @Max(100)
  confianza!: number;

  @ApiProperty()
  @IsString()
  modeloVersion!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  detalle?: Record<string, unknown>;
}