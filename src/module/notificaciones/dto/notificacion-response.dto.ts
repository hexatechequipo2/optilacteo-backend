import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { NivelAlerta } from '../enums/nivel-alerta.enum';
import { TipoNotificacion } from '../enums/tipo-notificacion.enum';

export class NotificacionResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ enum: TipoNotificacion })
  tipo!: TipoNotificacion;

  @ApiProperty()
  mensaje!: string;

  @ApiPropertyOptional()
  data?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    enum: NivelAlerta,
    nullable: true,
  })
  nivelAlerta?: NivelAlerta | null;

  @ApiProperty()
  leida!: boolean;

  @ApiProperty()
  createdAt!: Date;
}