import { Notificacion } from '../entities/notificacion.entity';

import { NivelAlerta } from '../enums/nivel-alerta.enum';
import { TipoNotificacion } from '../enums/tipo-notificacion.enum';
import { EstadoAlerta } from '../enums/estado-alerta.enum';
import { TipoDesvioAnomalia } from '../enums/tipo-desvio-anomalia.enum';

import { NotificacionResponseDto } from '../dto/notificacion-response.dto';
import { NotificacionFilterQueryDto } from '../dto/notificacion-filter-query.dto';
import { NotificacionPaginadaResponseDto } from '../dto/notificacion-paginada-response.dto';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

export interface CrearNotificacionParams {
  tipo: TipoNotificacion;
  mensaje: string;
  data?: Record<string, unknown>;
  usuarioId: number;
  empresaId: number;
  nivelAlerta?: NivelAlerta;
  loteId?: number;
  parametro?: Parametro;
  sensorId?: number; // HU-31
  // HU-50
  tipoDesvio?: TipoDesvioAnomalia;
  confianza?: number;
  modeloVersion?: string;
}

const TIPOS_CON_ESTADO_ABIERTA = [
  TipoNotificacion.ALERTA_UMBRAL,
  TipoNotificacion.ALERTA_SENSOR_DESCONECTADO, // HU-31
  TipoNotificacion.ALERTA_ANOMALIA, // HU-50
];

export class NotificacionMapper {
  static toEntity(params: CrearNotificacionParams): Partial<Notificacion> {
    return {
      tipo: params.tipo,
      mensaje: params.mensaje,
      data: params.data ?? null,
      usuarioId: params.usuarioId,
      empresaId: params.empresaId,
      nivelAlerta: params.nivelAlerta ?? null,
      loteId: params.loteId ?? null,
      parametro: params.parametro ?? null,
      sensorId: params.sensorId ?? null, // HU-31

      // HU-50
      tipoDesvio: params.tipoDesvio ?? null,
      confianza: params.confianza ?? null,
      modeloVersion: params.modeloVersion ?? null,

      estado: TIPOS_CON_ESTADO_ABIERTA.includes(params.tipo)
        ? EstadoAlerta.ABIERTA
        : null,

      leida: false,
    };
  }

  static toPaginatedResponse(
    entities: Notificacion[],
    total: number,
    query: NotificacionFilterQueryDto,
  ): NotificacionPaginadaResponseDto {
    return {
      data: this.toResponseList(entities),
      total,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };
  }

  static toResponse(entity: Notificacion): NotificacionResponseDto {
    const dto = new NotificacionResponseDto();

    dto.id = entity.id;
    dto.tipo = entity.tipo;
    dto.mensaje = entity.mensaje;
    dto.data = entity.data ?? null;
    dto.nivelAlerta = entity.nivelAlerta ?? null;
    dto.loteId = entity.loteId ?? null;
    dto.loteCodigo = entity.lote?.codigo ?? null;
    dto.parametro = entity.parametro ?? null;
    dto.sensorId = entity.sensorId ?? null; // HU-31

    // HU-50
    dto.tipoDesvio = entity.tipoDesvio ?? null;
    dto.confianza = entity.confianza ?? null;
    dto.modeloVersion = entity.modeloVersion ?? null;
    dto.marcadaFalsoPositivoPorId = entity.marcadaFalsoPositivoPorId ?? null;
    dto.fechaMarcadoFalsoPositivo = entity.fechaMarcadoFalsoPositivo ?? null;

    dto.estado = entity.estado ?? null;
    dto.accionCorrectiva = entity.accionCorrectiva ?? null;
    dto.resueltaPorId = entity.resueltaPorId ?? null;
    dto.fechaResolucion = entity.fechaResolucion ?? null;
    dto.leida = entity.leida;
    dto.createdAt = entity.createdAt;

    return dto;
  }

  static toResponseList(entities: Notificacion[]): NotificacionResponseDto[] {
    return entities.map((entity) => this.toResponse(entity));
  }
}