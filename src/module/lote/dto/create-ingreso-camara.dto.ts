import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsDateString,
} from 'class-validator';

export class CreateIngresoCamaraDto {
  @ApiProperty({ description: 'ID del SKU dado de alta por la empresa' })
  @IsInt()
  skuId!: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @IsPositive()
  cantidad!: number;

  @ApiPropertyOptional({
    description: 'Lote de producción de origen (opcional)',
  })
  @IsOptional()
  @IsInt()
  loteId?: number;

  @ApiProperty({ example: '2026-08-09T00:00:00.000Z' })
  @IsDateString()
  fechaIngreso!: string;
}
