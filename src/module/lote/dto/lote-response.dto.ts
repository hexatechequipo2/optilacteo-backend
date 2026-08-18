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

  // HU-66: valor comprometido por remito para este parámetro (si se cargó).
  @ApiPropertyOptional({ nullable: true })
  valorComprometido?: number | null;
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

  // --- NUEVO (HU-36): tambo de origen ---
  @ApiProperty({ description: 'Tambo de origen del lote' })
  tamboId!: number;

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

  @ApiPropertyOptional({ description: 'Cantidad total ingresada del lote' })
  cantidad?: number | null;

  @ApiPropertyOptional({ description: 'Saldo remanente disponible para consumo' })
  cantidadDisponible?: number | null;

  // HU-66: cantidad comprometida según remito del proveedor. Null si no se cargó (AC4).
  @ApiPropertyOptional({
    nullable: true,
    example: 500,
    description: 'Cantidad comprometida según remito del proveedor',
  })
  cantidadComprometidaKg?: number | null;

  @ApiProperty({ type: [LoteParametroResponseDto] })
  parametros!: LoteParametroResponseDto[];

  @ApiPropertyOptional({ enum: UnidadRendimiento })
  unidadRendimiento?: UnidadRendimiento | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional({ type: TrazabilidadEntidadDto })
  auditoria?: TrazabilidadEntidadDto;
}