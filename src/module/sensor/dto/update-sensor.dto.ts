import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSensorDto } from './create-sensor.dto';

export class UpdateSensorDto extends PartialType(
  OmitType(CreateSensorDto, ['ubicacion'] as const),
) {}