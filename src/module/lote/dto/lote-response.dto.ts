import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { ClasificacionLote } from '../enums/clasificacion-lote.enum';
import { DestinoLote } from '../enums/destino-lote.enum';
import { EstadoLote } from '../enums/estado-lote.enum';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

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

  @ApiProperty({ enum: EstadoLote })
  estado!: EstadoLote;

  @ApiProperty({ type: [LoteParametroResponseDto] })
  parametros!: LoteParametroResponseDto[];

  @ApiProperty()
  createdAt!: Date;
}