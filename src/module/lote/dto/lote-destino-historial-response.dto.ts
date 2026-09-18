import { ApiProperty } from '@nestjs/swagger';
import type { OrigenDestinoHistorial } from '../entities/lote-destino-historial.entity';

export class LoteDestinoHistorialResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() loteId!: number;
  @ApiProperty() destinoProductivoId!: number;
  @ApiProperty() destinoProductivoNombre!: string;
  @ApiProperty({ nullable: true }) destinoAnteriorId!: number | null;
  @ApiProperty({ nullable: true }) destinoAnteriorNombre!: string | null;
  @ApiProperty() usuarioId!: number;
  @ApiProperty({ enum: ['manual', 'recomendacion_ml'] })
  origen!: OrigenDestinoHistorial;
  @ApiProperty({ nullable: true }) recomendacionDestinoId!: number | null;
  @ApiProperty() createdAt!: Date;
}