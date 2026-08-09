import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { ClasificacionLote } from '../enums/clasificacion-lote.enum';
import { DestinoLote } from '../enums/destino-lote.enum';
import { EstadoLote } from '../enums/estado-lote.enum';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { Ubicacion } from '../../sensor/enums/ubicacion.enum';
import { TrazabilidadEntidadDto } from '../../audit/dto/trazabilidad.dto';
import { UnidadRendimiento } from '../enums/unidad-rendimiento.enum';

export class LoteParametroResponseDto {
  @ApiProperty({ enum: Parametro })
  parametro!: Parametro;

  @ApiProperty()
  valor!: number;
}

export class LoteResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  codigo!: string;

  @ApiProperty()
  empresaId!: number;

  @ApiProperty()
  proveedorId!: number;

  @ApiProperty({ enum: TipoMateriaPrima })
  materiaPrima!: TipoMateriaPrima;

  @ApiProperty()
  fechaIngreso!: Date;

  @ApiPropertyOptional({ enum: ClasificacionLote })
  clasificacion?: ClasificacionLote | null;

  @ApiPropertyOptional({ enum: DestinoLote })
  destinoInicial?: DestinoLote | null;

  @ApiPropertyOptional({ enum: Ubicacion })
  ubicacionInicial?: Ubicacion | null;

  @ApiProperty({ enum: EstadoLote })
  estado!: EstadoLote;

  @ApiPropertyOptional({
    description: 'Rendimiento registrado al finalizar el lote',
  })
  rendimiento?: number | null;

  @ApiProperty({ type: [LoteParametroResponseDto] })
  parametros!: LoteParametroResponseDto[];

  @ApiPropertyOptional({ enum: UnidadRendimiento })
  unidadRendimiento?: UnidadRendimiento | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional({ type: TrazabilidadEntidadDto })
  auditoria?: TrazabilidadEntidadDto;
}
