import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({
    example: 'operario@lacteo.com',
    description: 'Email registrado del usuario que solicita el restablecimiento',
  })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  email!: string;
}