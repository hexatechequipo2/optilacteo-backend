import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ActualizarConfiguracionAlertaDesconexionDto {
  @ApiProperty({ minimum: 1, example: 15 })
  @IsInt()
  @Min(1)
  umbralMinutos!: number;
}
