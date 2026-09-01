import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { NivelAlerta } from '../enums/nivel-alerta.enum';

// La exclusividad rolId/usuarioId (exactamente uno de los dos) se valida
// en el service, no acá, porque class-validator no expresa bien un XOR
// entre dos campos opcionales sin volverse ilegible.
export class CrearConfiguracionNotificacionDto {
  @ApiProperty({ enum: NivelAlerta })
  @IsEnum(NivelAlerta)
  nivelAlerta!: NivelAlerta;

  @ApiPropertyOptional({
    description: 'Asignar por rol (excluyente con usuarioId)',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  rolId?: number;

  @ApiPropertyOptional({
    description: 'Asignar a un usuario puntual (excluyente con rolId)',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  usuarioId?: number;
}
