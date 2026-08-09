import { ApiProperty } from '@nestjs/swagger';
import { OrigenLectura } from '../enums/origen-lectura.enum';

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

  @ApiProperty({ enum: OrigenLectura })
  origen!: OrigenLectura;

  @ApiProperty({ nullable: true })
  usuarioId!: number | null;

  @ApiProperty()
  createdAt!: Date;
}
