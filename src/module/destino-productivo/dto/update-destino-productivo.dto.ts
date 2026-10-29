import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateDestinoProductivoDto {
  @ApiPropertyOptional({ example: 'Venta de grano' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100) // ajustalo al largo de tu CreateDestinoProductivoDto
  nombre?: string;

  @ApiPropertyOptional({ description: 'Permite reactivar un destino desactivado' })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}