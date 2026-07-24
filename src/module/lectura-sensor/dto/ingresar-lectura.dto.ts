import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsString } from 'class-validator';

// Contrato de ingesta del PLC/simulador: nombres en snake_case porque es un
// contrato externo fijo (lo habla el dispositivo, no el resto de la API),
// no debe cambiar el día que se conecte un PLC real.
export class IngresarLecturaDto {
  @ApiProperty({
    description: 'Nombre del sensor (Sensor.nombre) que reporta la lectura.',
  })
  @IsString()
  @IsNotEmpty()
  sensor_id!: string;

  @ApiProperty({
    description: 'Código del lote (Lote.codigo) al que pertenece la lectura.',
  })
  @IsString()
  @IsNotEmpty()
  lote_id!: string;

  @ApiProperty()
  @IsNumber()
  valor!: number;

  @ApiProperty({
    description: 'Timestamp ISO-8601 reportado por el PLC/simulador.',
  })
  @IsDateString()
  timestamp!: string;
}
