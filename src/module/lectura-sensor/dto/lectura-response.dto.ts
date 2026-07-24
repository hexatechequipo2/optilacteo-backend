import { ApiProperty } from '@nestjs/swagger';

export class LecturaResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  sensorId!: number;

  @ApiProperty()
  loteId!: number;

  @ApiProperty()
  valor!: number;

  @ApiProperty()
  timestampLectura!: Date;

  @ApiProperty()
  empresaId!: number;

  @ApiProperty()
  createdAt!: Date;
}
