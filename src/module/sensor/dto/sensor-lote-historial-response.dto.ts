import { ApiProperty } from '@nestjs/swagger';

export class SensorLoteHistorialResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  sensorId!: number;

  @ApiProperty({ nullable: true })
  loteIdAnterior?: number | null;

  @ApiProperty()
  loteIdNuevo!: number;

  @ApiProperty()
  userId!: number;

  @ApiProperty()
  fecha!: Date;
}