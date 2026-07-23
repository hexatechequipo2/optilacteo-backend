import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoSensor } from '../enums/tipo-sensor.enum';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { EstadoSensor } from '../enums/estado-sensor.enum';
import { Ubicacion } from '../enums/ubicacion.enum';

export class SensorFilterQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ enum: TipoSensor })
  @IsOptional()
  @IsEnum(TipoSensor)
  tipo?: TipoSensor;

  @ApiPropertyOptional({ enum: Parametro })
  @IsOptional()
  @IsEnum(Parametro)
  parametro?: Parametro;

  @ApiPropertyOptional({ enum: EstadoSensor })
  @IsOptional()
  @IsEnum(EstadoSensor)
  estado?: EstadoSensor;

  @ApiPropertyOptional({ enum: Ubicacion })
  @IsOptional()
  @IsEnum(Ubicacion)
  ubicacion?: Ubicacion;
}