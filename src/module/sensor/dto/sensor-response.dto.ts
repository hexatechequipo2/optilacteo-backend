import { ApiProperty } from '@nestjs/swagger';
import { TipoSensor } from '../enums/tipo-sensor.enum';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { EstadoSensor } from '../enums/estado-sensor.enum';
import { Ubicacion } from '../enums/ubicacion.enum';

export class SensorResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  nombre!: string;

  @ApiProperty({ enum: TipoSensor })
  tipo!: TipoSensor;

  @ApiProperty({ enum: Parametro })
  parametro!: Parametro;

  @ApiProperty({ enum: Ubicacion })
  ubicacion!: Ubicacion;

  @ApiProperty()
  rangoMinFavor!: number;

  @ApiProperty()
  rangoMaxFavor!: number;

  @ApiProperty({ enum: EstadoSensor })
  estado!: EstadoSensor;

  @ApiProperty({ nullable: true })
  ultimaLectura?: Date | null;

  // Derivado del historial, no es columna propia.
  @ApiProperty({ nullable: true })
  loteActualId?: number | null;

  @ApiProperty()
  empresaId!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}