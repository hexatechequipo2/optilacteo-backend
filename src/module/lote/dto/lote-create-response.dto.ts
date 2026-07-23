import { ApiProperty } from '@nestjs/swagger';
import { LoteResponseDto } from './lote-response.dto';
import { SensorResponseDto } from '../../sensor/dto/sensor-response.dto';

export class LoteCreateResponseDto {
  @ApiProperty({ type: LoteResponseDto })
  lote!: LoteResponseDto;

  @ApiProperty({ type: [SensorResponseDto] })
  sensoresDisponibles!: SensorResponseDto[];
}