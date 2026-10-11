import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TipoAccion } from '../enums/tipo-accion.enum';

export class QueryAuditLogDto {
  @ApiPropertyOptional({ description: 'Filtra por ID de usuario' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({
    description:
      "Filtra por acción base (ej: 'PROVEEDOR_ELIMINAR'). Sin 'estado', matchea SUCCESS y FAILURE.",
  })
  @IsOptional()
  @IsString()
  accion?: string;

  @ApiPropertyOptional({
    description: "Combinado con 'accion', filtra por resultado exacto.",
    enum: ['SUCCESS', 'FAILURE'],
  })
  @IsOptional()
  @IsIn(['SUCCESS', 'FAILURE'])
  estado?: 'SUCCESS' | 'FAILURE';

  @ApiPropertyOptional({ enum: TipoAccion })
  @IsOptional()
  @IsEnum(TipoAccion)
  tipo?: TipoAccion;

  @ApiPropertyOptional({ description: 'Fecha desde (ISO 8601), inclusive' })
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @ApiPropertyOptional({ description: 'Fecha hasta (ISO 8601), inclusive' })
  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}