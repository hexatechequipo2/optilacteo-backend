import { ApiProperty } from '@nestjs/swagger';
import { EventoTrazabilidadDto } from '../../lote/dto/trazabilidad-lote-response.dto';

export type EstadoFinalDemo = 'APTO' | 'NO_APTO';

export class DestinoSugeridoDemoDto {
  @ApiProperty({ example: 'manteca' })
  nombre!: string;

  @ApiProperty({ example: 0.87 })
  confianza!: number;
}

export class ResumenTurnoDemoResponseDto {
  @ApiProperty()
  loteId!: number;

  @ApiProperty()
  codigoLote!: string;

  @ApiProperty({ enum: ['APTO', 'NO_APTO'], nullable: true })
  estado!: EstadoFinalDemo | null;

  @ApiProperty({
    description:
      'Episodios de desvío: veces que la lectura pasó de estar dentro a fuera del umbral',
  })
  desvios!: number;

  @ApiProperty({
    description:
      'Alertas generadas para el lote (sin repetir por destinatario)',
  })
  alertas!: number;

  @ApiProperty({ type: DestinoSugeridoDemoDto, nullable: true })
  destinoSugerido!: DestinoSugeridoDemoDto | null;

  @ApiProperty({ type: [EventoTrazabilidadDto] })
  eventos!: EventoTrazabilidadDto[];
}
