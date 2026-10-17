import { ApiProperty } from '@nestjs/swagger';

export class TurnoDemoResponseDto {
  @ApiProperty()
  loteId!: number;

  @ApiProperty({ description: 'Sensor tomado (el elegido o el asignado)' })
  sensorId!: number;

  @ApiProperty({ description: 'N del nombre "Sensor N"', example: 3 })
  numero!: number;
}
