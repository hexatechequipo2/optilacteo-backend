import {
  IsArray,
  IsDefined,
  IsEnum,
  ArrayMinSize,
  Validate,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import {
  FechaCalendarioValidator,
  RangoFechasCoherenteValidator,
} from '../validators/rango-fechas.validator';

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

  // HU-75: solo día calendario (sin hora); se interpreta en hora AR.
  @ApiPropertyOptional({
    description: 'Requerido si periodo=rango. Formato YYYY-MM-DD, inclusivo',
  })
  @ValidateIf(
    (o: EvolucionIndicadoresQueryDto) =>
      o.periodo === PeriodoEvolucion.RANGO || o.desde !== undefined,
  )
  @IsDefined({ message: 'desde es requerido cuando periodo=rango' })
  @Validate(FechaCalendarioValidator)
  desde?: string;

  @ApiPropertyOptional({
    description: 'Requerido si periodo=rango. Formato YYYY-MM-DD, inclusivo',
  })
  @ValidateIf(
    (o: EvolucionIndicadoresQueryDto) =>
      o.periodo === PeriodoEvolucion.RANGO || o.hasta !== undefined,
  )
  @IsDefined({ message: 'hasta es requerido cuando periodo=rango' })
  @Validate(FechaCalendarioValidator)
  @Validate(RangoFechasCoherenteValidator)
  hasta?: string;
}