import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

export class CreateLoteParametroDto {
  @ApiProperty({ enum: Parametro })
  @IsEnum(Parametro)
  parametro!: Parametro;

  @ApiProperty({ example: 6.7 })
  @IsNumber()
  valor!: number;

  // HU-66: valor comprometido por remito para este parámetro. Opcional (AC4).
  @ApiPropertyOptional({
    example: 6.5,
    description: 'Valor comprometido por remito del proveedor para este parámetro',
  })
  @IsOptional()
  @IsNumber()
  valorComprometido?: number;
}