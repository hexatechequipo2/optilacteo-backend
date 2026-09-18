import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CrearConfiguracionSilencioDto {
  @ApiPropertyOptional({
    description: 'Nombre identificatorio, ej. "Turno nocturno"',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  nombre?: string;

  @ApiProperty({ example: '22:00', description: 'Hora de inicio (HH:mm)' })
  @Matches(HORA_REGEX, { message: 'horaInicio debe tener formato HH:mm' })
  horaInicio!: string;

  @ApiProperty({
    example: '06:00',
    description:
      'Hora de fin (HH:mm). Si es menor a horaInicio, el horario cruza la medianoche',
  })
  @Matches(HORA_REGEX, { message: 'horaFin debe tener formato HH:mm' })
  horaFin!: string;

  @ApiPropertyOptional({
    description:
      'Días en que aplica (0=domingo..6=sábado). Vacío/ausente = todos los días',
    example: [0, 6],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  diasSemana?: number[];
}