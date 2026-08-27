import { ApiProperty } from '@nestjs/swagger';
import { TipoEventoTrazabilidad } from '../enums/tipo-evento-trazabilidad.enum';

export class EventoTrazabilidadDto {
  @ApiProperty({ enum: TipoEventoTrazabilidad })
  tipo!: TipoEventoTrazabilidad;

  @ApiProperty()
  fecha!: Date;

  @ApiProperty()
  descripcion!: string;

  // Datos crudos del evento, distintos según `tipo`. Se deja tipado como
  // Record abierto a propósito: cada fuente (clasificación, consumo,
  // ubicación, etc.) tiene forma distinta y no vale la pena forzar una
  // interfaz común artificial solo para el detalle.
  @ApiProperty()
  detalle!: Record<string, unknown>;
}

export class TrazabilidadLoteResponseDto {
  @ApiProperty()
  loteId!: number;

  @ApiProperty()
  codigoLote!: string;

  @ApiProperty({ type: [EventoTrazabilidadDto] })
  eventos!: EventoTrazabilidadDto[];
}