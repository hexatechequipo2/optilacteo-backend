import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResolverAlertaDto {
  @ApiProperty({
    description: 'Acción correctiva tomada para resolver la alerta',
    example: 'Se recalibró el sensor de temperatura del tanque 2.',
  })
  @IsString()
  @IsNotEmpty({ message: 'La acción correctiva es obligatoria' })
  @MinLength(5, {
    message: 'La acción correctiva debe tener al menos 5 caracteres',
  })
  accionCorrectiva!: string;
}
