import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

// HU-77: estado DERIVADO de los lotes de ingreso consumidos (no es una
// columna de lote_produccion).
export const ESTADOS_PRODUCCION = ['sin_consumos', 'en_proceso', 'finalizado'] as const;
export type EstadoProduccion = (typeof ESTADOS_PRODUCCION)[number];

export const DESCRIPCION_ESTADO_PRODUCCION: Record<EstadoProduccion, string> = {
  sin_consumos: 'Sin consumos registrados.',
  en_proceso:
    'Al menos uno de los lotes de ingreso consumidos sigue abierto (puede tener saldo para otras producciones).',
  finalizado: 'Todos los lotes de ingreso consumidos están finalizados o rechazados.',
};

export const PRODUCCION_SORT_FIELDS = ['codigo', 'fecha', 'estado', 'lotesOrigen'] as const;
export type ProduccionSortField = (typeof PRODUCCION_SORT_FIELDS)[number];

export class LoteProduccionFilterQueryDto {
  @ApiPropertyOptional({ example: '2026-10-01', description: 'Fecha de inicio (primer consumo), desde. Hora Argentina.' })
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'Fecha de inicio, hasta (incluye todo el día).' })
  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @ApiPropertyOptional({ description: 'Lotes que consumieron al menos un ingreso de este proveedor.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  proveedorId?: number;

  @ApiPropertyOptional({ description: 'Lotes que consumieron al menos un ingreso de este tambo.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tamboId?: number;

  @ApiPropertyOptional({
    enum: ESTADOS_PRODUCCION,
    description:
      'Estado derivado. "en_proceso" = algún lote de ingreso consumido sigue abierto; ' +
      '"finalizado" = todos los orígenes están finalizados o rechazados.',
  })
  @IsOptional()
  @IsIn(ESTADOS_PRODUCCION)
  estado?: EstadoProduccion;

  @ApiPropertyOptional({ enum: PRODUCCION_SORT_FIELDS, default: 'fecha' })
  @IsOptional()
  @IsIn(PRODUCCION_SORT_FIELDS)
  sortBy?: ProduccionSortField;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}