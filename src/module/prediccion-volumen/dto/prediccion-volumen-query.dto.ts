import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';

export class PrediccionVolumenQueryDto {
  @ApiProperty({ enum: TipoMateriaPrima })
  @IsEnum(TipoMateriaPrima)
  tipoMateriaPrima!: TipoMateriaPrima;

  // Criterio 4: el usuario elige cuánto histórico reciente comparar junto
  // a la predicción. La predicción en sí siempre es de 7 días fijos — esto
  // solo controla la ventana de histórico real que se devuelve al lado.
  @ApiPropertyOptional({ default: 14, minimum: 7, maximum: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(90)
  diasHistorico?: number = 14;
}