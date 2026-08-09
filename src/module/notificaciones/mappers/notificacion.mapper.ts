import { Notificacion } from '../entities/notificacion.entity';
import { TipoNotificacion } from '../enums/tipo-notificacion.enum';
import { NotificacionResponseDto } from '../dto/notificacion-response.dto';
import { NotificacionFilterQueryDto } from '../dto/notificacion-filter-query.dto';
import { NotificacionPaginadaResponseDto } from '../dto/notificacion-paginada-response.dto';

export interface CrearNotificacionParams {
  tipo: TipoNotificacion;
  mensaje: string;
  data?: Record<string, unknown>;
  usuarioId: number;
  empresaId: number;
}

export class NotificacionMapper {
  static toEntity(params: CrearNotificacionParams): Partial<Notificacion> {
    return {
      tipo: params.tipo,
      mensaje: params.mensaje,
      data: params.data ?? null,
      usuarioId: params.usuarioId,
      empresaId: params.empresaId,
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
    dto.leida = entity.leida;
    dto.createdAt = entity.createdAt;
    return dto;
  }

  static toResponseList(entities: Notificacion[]): NotificacionResponseDto[] {
    return entities.map((e) => this.toResponse(e));
  }
}
