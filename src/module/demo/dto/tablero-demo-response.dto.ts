import { ApiProperty } from '@nestjs/swagger';
import type { EstadoFinalDemo } from './resumen-turno-demo-response.dto';

export type SemaforoDemo = 'EN_RANGO' | 'FUERA_DE_RANGO';

export class LoteTableroDemoDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  codigo!: string;
}

export class UmbralTableroDemoDto {
  @ApiProperty({ example: 2 })
  min!: number;

  @ApiProperty({ example: 6 })
  max!: number;
}

// Solo lo que se muestra en la tele: sin ids de usuario, empresa ni datos
// de proveedor.
export class SensorTableroDemoDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ example: 'Sensor 1 · Juan' })
  nombre!: string;

  @ApiProperty({
    description:
      'Hay un turno en curso. Si es false, los datos son del último turno del sensor.',
  })
  ocupado!: boolean;

  @ApiProperty({ type: LoteTableroDemoDto, nullable: true })
  lote!: LoteTableroDemoDto | null;

  @ApiProperty({ type: Number, nullable: true })
  ultimaTemperatura!: number | null;

  @ApiProperty({ type: Date, nullable: true })
  ultimaLecturaEn!: Date | null;

  @ApiProperty({ enum: ['EN_RANGO', 'FUERA_DE_RANGO'], nullable: true })
  semaforo!: SemaforoDemo | null;

  @ApiProperty({ enum: ['APTO', 'NO_APTO'], nullable: true })
  clasificacion!: EstadoFinalDemo | null;

  @ApiProperty({ description: 'Episodios de desvío del turno' })
  desvios!: number;

  @ApiProperty({
    description: 'Alertas del turno (sin repetir por destinatario)',
  })
  alertas!: number;
}

export class TableroDemoResponseDto {
  @ApiProperty({ type: UmbralTableroDemoDto, nullable: true })
  umbral!: UmbralTableroDemoDto | null;

  @ApiProperty({ type: [SensorTableroDemoDto] })
  sensores!: SensorTableroDemoDto[];
}
