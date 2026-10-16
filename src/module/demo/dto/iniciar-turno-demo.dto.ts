import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { DEMO_NOMBRE_MAX_CARACTERES } from '../constants/demo.constants';

// El nombre lo escribe un visitante y termina en el nombre del sensor que
// se ve en pantalla: se descarta todo lo que no sea letra, espacio o guion
// (en vez de rechazar el pedido) y se recorta al máximo permitido.
export function sanitizarNombreVisitante(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor;
  return valor
    .normalize('NFC')
    .replace(/[^\p{L} -]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, DEMO_NOMBRE_MAX_CARACTERES)
    .trim();
}

export class IniciarTurnoDemoDto {
  @ApiPropertyOptional({
    description:
      'Id del sensor de la empresa demo. Si no viene, se asigna el sensor disponible (libre o con el turno vencido) de menor N.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  sensorId?: number;

  @ApiProperty({
    description: `Nombre del visitante: solo letras, espacios y guiones, máx. ${DEMO_NOMBRE_MAX_CARACTERES} caracteres`,
    example: 'Juan',
  })
  @Transform(({ value }) => sanitizarNombreVisitante(value))
  @IsString()
  @IsNotEmpty({ message: 'El nombre debe tener al menos una letra' })
  @MaxLength(DEMO_NOMBRE_MAX_CARACTERES)
  nombre!: string;
}
