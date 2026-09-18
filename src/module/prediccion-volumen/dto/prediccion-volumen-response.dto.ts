import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { UnidadCantidad } from '../../lote/enums/unidad-cantidad.enum';
import { StatusPrediccion } from '../enums/status-prediccion.enum';

export class DiaPrediccionDto {
  @ApiProperty()
  fecha!: string;

  @ApiProperty()
  minimo!: number;

  @ApiProperty()
  esperado!: number;

  @ApiProperty()
  maximo!: number;
}

export class DiaHistoricoDto {
  @ApiProperty()
  fecha!: string;

  @ApiProperty()
  valor!: number;
}

export class PrediccionVolumenResponseDto {
  @ApiProperty({ enum: StatusPrediccion })
  status!: StatusPrediccion;

  @ApiProperty({ enum: TipoMateriaPrima })
  tipoMateriaPrima!: TipoMateriaPrima;

  @ApiPropertyOptional({ enum: UnidadCantidad, nullable: true })
  unidad?: UnidadCantidad | null;

  // Criterio 3: fecha en que el modelo generó esta predicción — no la
  // fecha del GET, sino la del último cron que corrió.
  @ApiPropertyOptional({ nullable: true })
  fechaActualizacionModelo?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  modeloVersion?: string | null;

  // Criterio 1 y 2: 7 días con intervalo de confianza. Vacío si
  // status = insufficient_data.
  @ApiProperty({ type: [DiaPrediccionDto] })
  prediccion!: DiaPrediccionDto[];

  // Criterio 4: histórico reciente para comparar en el mismo gráfico.
  @ApiProperty({ type: [DiaHistoricoDto] })
  historicoReciente!: DiaHistoricoDto[];

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Mensaje explicativo cuando status=insufficient_data (ej. cuántos días faltan)',
  })
  mensaje?: string | null;
}