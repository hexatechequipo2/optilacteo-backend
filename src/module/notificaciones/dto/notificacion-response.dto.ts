import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

  @ApiProperty()
  leida!: boolean;

  @ApiProperty()
  createdAt!: Date;
}
