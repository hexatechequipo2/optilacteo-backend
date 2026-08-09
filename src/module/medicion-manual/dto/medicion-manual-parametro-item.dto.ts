import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber } from 'class-validator';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

export class MedicionManualParametroItemDto {
  @ApiProperty({ enum: Parametro })
  @IsEnum(Parametro, { message: 'parametro inválido' })
  parametro!: Parametro;

  // AC7: valor no numérico debe fallar acá, antes de llegar al service.
  @ApiProperty({ example: 6.7 })
  @IsNumber({}, { message: 'el valor debe ser numérico' })
  valor!: number;
}
