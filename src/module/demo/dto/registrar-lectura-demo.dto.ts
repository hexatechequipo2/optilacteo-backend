import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Min } from 'class-validator';

export class RegistrarLecturaDemoDto {
  @ApiProperty({ example: 120 })
  @IsInt()
  @Min(1)
  loteId!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  sensorId!: number;

  @ApiProperty({ example: 4.2 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  valor!: number;
}
