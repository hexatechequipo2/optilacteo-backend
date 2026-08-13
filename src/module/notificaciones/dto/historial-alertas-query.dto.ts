import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { EstadoAlerta } from '../enums/estado-alerta.enum';

export class HistorialAlertasQueryDto {
  @ApiPropertyOptional({ enum: EstadoAlerta, description: 'Filtrar por estado' })
  @IsOptional()
  @IsEnum(EstadoAlerta)
  estado?: EstadoAlerta;

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