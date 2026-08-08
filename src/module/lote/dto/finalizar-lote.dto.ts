import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { UnidadRendimiento } from '../enums/unidad-rendimiento.enum';

export class FinalizarLoteDto {
  @ApiPropertyOptional({
    description: 'Rendimiento obtenido al finalizar el lote',
    example: 87.5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El rendimiento debe ser un valor numérico' })
  @Min(0, { message: 'El rendimiento no puede ser negativo' })
  rendimiento?: number;

  @ApiPropertyOptional({
    description: 'Unidad del rendimiento. Obligatoria si se informa rendimiento.',
    enum: UnidadRendimiento,
    example: UnidadRendimiento.PORCENTAJE,
  })
  // Si viene rendimiento, unidad deja de ser opcional.
  @ValidateIf((dto: FinalizarLoteDto) => dto.rendimiento !== undefined)
  @IsEnum(UnidadRendimiento, {
    message: `unidadRendimiento es obligatoria cuando se informa rendimiento. Valores válidos: ${Object.values(UnidadRendimiento).join(', ')}`,
  })
  unidadRendimiento?: UnidadRendimiento;
}