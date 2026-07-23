import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { TipoSensor } from '../enums/tipo-sensor.enum';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { Ubicacion } from '../enums/ubicacion.enum';

export class CreateSensorDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({ enum: TipoSensor })
  @IsEnum(TipoSensor)
  tipo!: TipoSensor;

  @ApiProperty({ enum: Parametro })
  @IsEnum(Parametro)
  parametro!: Parametro;

  @ApiProperty({ enum: Ubicacion })
  @IsEnum(Ubicacion)
  ubicacion!: Ubicacion;

  @ApiProperty()
  @IsNumber()
  rangoMinFavor!: number;

  @ApiProperty()
  @IsNumber()
  rangoMaxFavor!: number;
}