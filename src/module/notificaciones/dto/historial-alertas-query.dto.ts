import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsISO8601, IsInt, IsOptional, Min } from 'class-validator';

import { EstadoAlerta } from '../enums/estado-alerta.enum';
import { NivelAlerta } from '../enums/nivel-alerta.enum';

export class HistorialAlertasQueryDto {
  @ApiPropertyOptional({
    enum: EstadoAlerta,
    description: 'Filtrar por estado de la alerta',
  })
  @IsOptional()
  @IsEnum(EstadoAlerta)
  estado?: EstadoAlerta;

  @ApiPropertyOptional({
    description: 'ID del lote',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  loteId?: number;

  @ApiPropertyOptional({
    enum: NivelAlerta,
    description: 'Filtrar por nivel de alerta',
    example: NivelAlerta.CRITICA,
  })
  @IsOptional()
  @IsEnum(NivelAlerta)
  nivelAlerta?: NivelAlerta;

  @ApiPropertyOptional({
    description: 'Fecha inicial del período',
    example: '2026-08-01',
  })
  @IsOptional()
  @IsISO8601()
  fechaInicio?: string;

  @ApiPropertyOptional({
    description: 'Fecha final del período',
    example: '2026-08-12',
  })
  @IsOptional()
  @IsISO8601()
  fechaFin?: string;

  @ApiPropertyOptional({
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
