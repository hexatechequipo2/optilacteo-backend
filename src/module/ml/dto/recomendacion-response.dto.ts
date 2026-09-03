import { ApiProperty } from '@nestjs/swagger';
import type { EstadoRecomendacion } from '../entities/recomendacion-destino.entity';

export class RecomendacionResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  destinoRecomendadoId!: number;

  @ApiProperty()
  destinoRecomendadoNombre!: string;

  @ApiProperty()
  confianza!: number;

  // Union de strings, no un enum real de TS — Swagger no puede inferir el
  // tipo de metadata en runtime para esto, así que se lo pasamos a mano.
  @ApiProperty({ enum: ['pendiente', 'aceptada', 'rechazada'] })
  estado!: EstadoRecomendacion;
}