import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsPositive } from 'class-validator';

export class IngresarLecturaManualDto {
  @ApiProperty({ description: 'ID del sensor cuyo parámetro se carga manualmente.' })
  @IsInt()
  @IsPositive()
  sensorId!: number;

  @ApiProperty()
  @IsNumber()
  valor!: number;
}