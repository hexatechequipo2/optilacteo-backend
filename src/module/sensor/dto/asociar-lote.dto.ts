import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique} from 'class-validator';

export class AsociarLoteDto {
  @ApiProperty({ type: [Number] })
  @ArrayNotEmpty()
  @ArrayUnique()
  sensorIds!: number[];
}