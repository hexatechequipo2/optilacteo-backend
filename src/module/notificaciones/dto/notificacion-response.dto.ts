import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { NivelAlerta } from '../enums/nivel-alerta.enum';
import { TipoNotificacion } from '../enums/tipo-notificacion.enum';
import { EstadoAlerta } from '../enums/estado-alerta.enum';
import { TipoDesvioAnomalia } from '../enums/tipo-desvio-anomalia.enum';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

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

  @ApiPropertyOptional({
    nullable: true,
  })
  loteId?: number | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  loteCodigo?: string | null;

  @ApiPropertyOptional({
    enum: Parametro,
    nullable: true,
  })
  parametro?: Parametro | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  sensorId?: number | null;

  /**
   * HU-50: solo se completan para tipo = ALERTA_ANOMALIA.
   */
  @ApiPropertyOptional({
    enum: TipoDesvioAnomalia,
    nullable: true,
  })
  tipoDesvio?: TipoDesvioAnomalia | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Confianza del modelo ML, 0-100 (HU-50)',
  })
  confianza?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Versión del modelo que generó la detección (HU-50)',
  })
  modeloVersion?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Usuario que marcó la anomalía como falso positivo (HU-50)',
  })
  marcadaFalsoPositivoPorId?: number | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  fechaMarcadoFalsoPositivo?: Date | null;

  @ApiPropertyOptional({
    enum: EstadoAlerta,
    nullable: true,
  })
  estado?: EstadoAlerta | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  accionCorrectiva?: string | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  resueltaPorId?: number | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  fechaResolucion?: Date | null;

  @ApiProperty()
  leida!: boolean;

  @ApiProperty()
  createdAt!: Date;
}