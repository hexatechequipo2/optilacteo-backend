import { ApiProperty } from '@nestjs/swagger';
import { OrigenLectura } from '../enums/origen-lectura.enum';
import { EstadoMedicion } from '../enums/estado-medicion.enum';

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

  // HU-40: seteado por LecturaSensorService justo antes de emitir por
  // WebSocket / devolver la respuesta, no lo arma LecturaMapper.
  @ApiProperty({ enum: EstadoMedicion, required: false })
  estado?: EstadoMedicion;
}