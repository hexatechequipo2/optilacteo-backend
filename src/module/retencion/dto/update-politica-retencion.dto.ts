import { IsInt, IsOptional, Min } from 'class-validator';
import { RETENCION_MESES_MINIMO } from '../entities/politica-retencion.entity';

export class UpdatePoliticaRetencionDto {
  // AC4: valida en el DTO (primera barrera) y se re-valida en el service
  // (segunda barrera) para no depender de una sola capa.
  @IsInt({ message: 'retencionMeses debe ser un entero' })
  @Min(RETENCION_MESES_MINIMO, {
    message: `retencionMeses no puede ser menor a ${RETENCION_MESES_MINIMO} (requisito SENASA/CAA)`,
  })
  retencionMeses!: number;

  @IsOptional()
  @IsInt({ message: 'diasAvisoVencimiento debe ser un entero' })
  @Min(1, { message: 'diasAvisoVencimiento debe ser al menos 1 día' })
  diasAvisoVencimiento?: number;
}