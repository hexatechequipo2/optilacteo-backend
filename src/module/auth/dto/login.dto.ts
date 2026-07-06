import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'usuario@empresa.com' })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  email!: string;

  @ApiProperty({ example: 'contraseña123' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Si es true, el refresh_token se emite con una expiración extendida.',
  })
  @IsOptional()
  @IsBoolean({ message: 'rememberMe debe ser un valor booleano' })
  rememberMe?: boolean;
}
