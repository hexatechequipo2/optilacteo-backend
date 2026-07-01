import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateSystemConfigDto {
  @ApiProperty({
    description:
      'Tiempo de inactividad en minutos antes de cerrar la sesion automaticamente',
    example: 30,
    minimum: 1,
  })
  @IsInt({ message: 'El tiempo de inactividad debe ser un número entero' })
  @Min(1, { message: 'El tiempo de inactividad debe ser al menos 1 minuto' })
  inactivityTimeout!: number;
}
