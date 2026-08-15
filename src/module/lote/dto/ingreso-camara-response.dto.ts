import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IngresoCamaraResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  empresaId!: number;

  @ApiProperty()
  skuId!: number;

  @ApiPropertyOptional()
  skuNombre?: string;

  @ApiProperty()
  cantidad!: number;

  @ApiPropertyOptional()
  loteId?: number | null;

  @ApiPropertyOptional()
  loteCodigo?: string | null;

  @ApiProperty()
  fechaIngreso!: Date;

  @ApiProperty()
  createdAt!: Date;
}