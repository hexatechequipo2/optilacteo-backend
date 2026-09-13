import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

export enum PeriodoEvolucion {
  DIA = 'dia',
  SEMANA = 'semana',
  MES = 'mes',
  RANGO = 'rango',
}

export class EvolucionIndicadoresQueryDto {
  @ApiPropertyOptional({ enum: PeriodoEvolucion, default: PeriodoEvolucion.MES })
  @IsEnum(PeriodoEvolucion)
  periodo: PeriodoEvolucion = PeriodoEvolucion.MES;

  @ApiPropertyOptional({
    type: [String],
    enum: Parametro,
    description: 'Uno o más indicadores separados por coma, ej: materia_grasa,proteina',
  })
  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) =>
    Array.isArray(value) ? value : String(value).split(','),
  )
  @IsEnum(Parametro, { each: true })
  indicadores!: Parametro[];

  @ApiPropertyOptional({ description: 'Requerido si periodo=rango. Formato YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  desde?: string;

  @ApiPropertyOptional({ description: 'Requerido si periodo=rango. Formato YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  hasta?: string;
}