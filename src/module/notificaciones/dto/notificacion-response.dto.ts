import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { NivelAlerta } from '../enums/nivel-alerta.enum';
import { TipoNotificacion } from '../enums/tipo-notificacion.enum';
import { EstadoAlerta } from '../enums/estado-alerta.enum';

export class NotificacionResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ enum: TipoNotificacion })
  tipo!: TipoNotificacion;

  @ApiProperty()
  mensaje!: string;

  @ApiPropertyOptional()
  data?: Record<string, unknown> | null;

  @ApiPropertyOptional({ enum: NivelAlerta, nullable: true })
  nivelAlerta?: NivelAlerta | null;

  // HU-27
  @ApiPropertyOptional({ enum: EstadoAlerta, nullable: true })
  estado?: EstadoAlerta | null;

  @ApiPropertyOptional({ nullable: true })
  accionCorrectiva?: string | null;

  @ApiPropertyOptional({ nullable: true })
  resueltaPorId?: number | null;

  @ApiPropertyOptional({ nullable: true })
  fechaResolucion?: Date | null;

  @ApiProperty()
  leida!: boolean;

  @ApiProperty()
  createdAt!: Date;
}