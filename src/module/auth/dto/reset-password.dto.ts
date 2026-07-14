import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsUUID } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'uuid-token-generado',
    description: 'Token recibido por email (UUID de un solo uso)',
  })
  @IsUUID('4', { message: 'El token debe ser un UUID válido' })
  token!: string;

  @ApiProperty({
    example: 'NuevaPassword123!',
    description: 'Nueva contraseña (mínimo 8 caracteres)',
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  newPassword!: string;

  @ApiProperty({
    example: 'NuevaPassword123!',
    description: 'Confirmación de la nueva contraseña',
  })
  @IsString()
  @MinLength(8, { message: 'La confirmación debe tener al menos 8 caracteres' })
  confirmPassword!: string;
}