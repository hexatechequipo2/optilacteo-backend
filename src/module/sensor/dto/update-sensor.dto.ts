import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsInt, Min } from 'class-validator';
import { CreateSensorDto } from './create-sensor.dto';

export class UpdateSensorDto extends PartialType(
  OmitType(CreateSensorDto, ['ubicacion'] as const),
) {
  // HU-31: override opcional del umbral de desconexión a nivel sensor.
  // No forma parte de CreateSensorDto porque no aplica al crear el
  // sensor — solo se configura después, si se quiere pisar el default
  // de la empresa.
  @IsOptional()
  @IsInt()
  @Min(1)
  umbralDesconexionMinutos?: number | null;
}
