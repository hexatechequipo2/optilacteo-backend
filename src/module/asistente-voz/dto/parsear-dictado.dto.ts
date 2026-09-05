import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ParsearDictadoDto {
  // Texto ya transcripto por Web Speech API en el frontend — este endpoint
  // no hace speech-to-text, solo recibe el resultado.
  @ApiProperty({
    example: 'grasa 3,6 coma proteína 3,2, acidez 14 temperatura 4',
    description: 'Texto transcripto por el reconocedor de voz, sin procesar.',
  })
  @IsString({ message: 'texto debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'texto no puede estar vacío' })
  @MaxLength(2000, { message: 'texto no puede superar los 2000 caracteres' })
  texto!: string;
}
