import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FinalizarLoteDto {
  // HU-62 AC1/AC2/AC3: opcional, numérico, >= 0.
  @ApiPropertyOptional({
    description: 'Rendimiento obtenido al finalizar el lote',
    example: 87.5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El rendimiento debe ser un valor numérico' })
  @Min(0, { message: 'El rendimiento no puede ser negativo' })
  rendimiento?: number;
}