import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { CreateLoteConsumoParametroDto } from './create-lote-consumo-parametro.dto';

export class CreateLoteConsumoDto {
  @ApiPropertyOptional({
    description:
      'ID de un lote de producción ya existente. Si no se envía, se crea uno nuevo automáticamente.',
  })
  @IsOptional()
  @IsInt()
  loteProduccionId?: number;

  @ApiProperty({
    example: 15.5,
    description: 'Cantidad a consumir del remanente del lote de ingreso',
  })
  @IsNumber()
  @IsPositive()
  cantidad!: number;

  @ApiPropertyOptional({
    type: [CreateLoteConsumoParametroDto],
    description:
      'Parámetros de calidad del remanente. Obligatorio si NO es el primer consumo de este lote de ingreso (criterio 3 de HU-68); se valida en el service porque depende del historial, no del payload.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateLoteConsumoParametroDto)
  parametros?: CreateLoteConsumoParametroDto[];
}
