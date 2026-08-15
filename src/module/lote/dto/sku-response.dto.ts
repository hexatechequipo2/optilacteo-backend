import { ApiProperty } from '@nestjs/swagger';
import { UnidadMedidaSku } from '../enums/unidad-medida-sku.enum';

export class SkuResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  empresaId!: number;

  @ApiProperty()
  nombre!: string;

  @ApiProperty({ enum: UnidadMedidaSku })
  unidadMedida!: UnidadMedidaSku;

  @ApiProperty()
  activo!: boolean;

  @ApiProperty()
  createdAt!: Date;
}