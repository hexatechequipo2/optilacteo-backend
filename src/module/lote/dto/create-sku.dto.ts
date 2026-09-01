import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { UnidadMedidaSku } from '../enums/unidad-medida-sku.enum';

export class CreateSkuDto {
  @ApiProperty({ example: 'Manteca x 200g' })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({ enum: UnidadMedidaSku })
  @IsEnum(UnidadMedidaSku)
  unidadMedida!: UnidadMedidaSku;
}
