import { ApiProperty } from '@nestjs/swagger';

// HU-50: origen unificado de un punto de la serie, independientemente de
// la tabla de la que provenga. Cubre los tres casos posibles:
// - SENSOR: lote con sensor asociado, funcionando (sensor_lecturas, origen SENSOR)
// - MANUAL_FALLBACK: lote con sensor asociado pero en falla/inactivo,
//   fallback manual vía HU-15 (sensor_lecturas, origen MANUAL)
// - MANUAL_SIN_SENSOR: lote sin sensor asociado, HU-20 (mediciones_manuales_lote)
export enum OrigenPuntoSerie {
  SENSOR = 'sensor',
  MANUAL_FALLBACK = 'manual',
  MANUAL_SIN_SENSOR = 'manual_sin_sensor',
}

export class PuntoSerieResponseDto {
  @ApiProperty()
  loteId!: number;

  @ApiProperty()
  valor!: number;

  @ApiProperty()
  timestamp!: Date;

  @ApiProperty({ enum: OrigenPuntoSerie })
  origen!: OrigenPuntoSerie;
}