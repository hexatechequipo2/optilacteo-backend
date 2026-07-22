import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { EstadoLote } from '../enums/estado-lote.enum';
import { ClasificacionLote } from '../enums/clasificacion-lote.enum';

export class LoteFilterQueryDto {
  @ApiPropertyOptional({ enum: EstadoLote })
  @IsOptional()
  @IsEnum(EstadoLote)
  estado?: EstadoLote;

  @ApiPropertyOptional({ enum: ClasificacionLote })
  @IsOptional()
  @IsEnum(ClasificacionLote)
  clasificacion?: ClasificacionLote;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  proveedorId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}