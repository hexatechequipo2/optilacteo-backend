import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber } from 'class-validator';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

export class CreateLoteParametroDto {
  @ApiProperty({ enum: Parametro })
  @IsEnum(Parametro)
  parametro!: Parametro;

  @ApiProperty({ example: 6.7 })
  @IsNumber()
  valor!: number;
}