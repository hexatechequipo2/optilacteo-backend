import { ApiProperty } from '@nestjs/swagger';
import type { EstadoRecomendacion } from '../entities/recomendacion-destino.entity';

// HU-49: referencia liviana a un destino productivo (id + nombre), para que
// el frontend no necesite un segundo llamado a /destinos-productivos.
export class DestinoProductivoRefDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  nombre!: string;
}

export class RecomendacionPendienteResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ type: DestinoProductivoRefDto })
  destinoRecomendado!: DestinoProductivoRefDto;

  @ApiProperty()
  confianza!: number;

  // Union de strings, no un enum real de TS — Swagger no puede inferir el
  // tipo de metadata en runtime para esto, así que se lo pasamos a mano.
  @ApiProperty({ enum: ['pendiente', 'aceptada', 'rechazada'] })
  estado!: EstadoRecomendacion;

  @ApiProperty({ type: DestinoProductivoRefDto, nullable: true })
  destinoReal!: DestinoProductivoRefDto | null;
}
