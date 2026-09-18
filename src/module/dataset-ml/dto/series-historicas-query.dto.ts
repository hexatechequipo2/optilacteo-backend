import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsISO8601, IsInt, Min } from 'class-validator';

import { Parametro } from '../../config-parametro/enums/parametro.enum';

// HU-50: query params con los que el microservicio ML pide la serie
// histórica de un parámetro, para una empresa, en un rango de fechas.
export class SeriesHistoricasQueryDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  empresaId!: number;

  @ApiProperty({ enum: Parametro })
  @IsEnum(Parametro)
  parametro!: Parametro;

  @ApiProperty({ example: '2026-07-01' })
  @IsISO8601()
  desde!: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsISO8601()
  hasta!: string;
}