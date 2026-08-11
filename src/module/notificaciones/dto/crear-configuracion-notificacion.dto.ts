import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsPositive } from 'class-validator';
import { NivelAlerta } from '../enums/nivel-alerta.enum';

export class CrearConfiguracionNotificacionDto {
  @ApiProperty({ enum: NivelAlerta })
  @IsEnum(NivelAlerta)
  nivelAlerta!: NivelAlerta;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  rolId!: number;
}