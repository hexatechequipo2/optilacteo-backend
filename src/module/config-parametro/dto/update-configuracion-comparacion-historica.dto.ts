import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdateConfiguracionComparacionHistoricaDto {
  @ApiProperty({ required: false, example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  desvioSignificativoPorcentaje?: number;

  @ApiProperty({ required: false, example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  cantidadRegistrosHistoricos?: number;
}