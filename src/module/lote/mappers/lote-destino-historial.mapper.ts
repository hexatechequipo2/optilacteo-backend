import { LoteDestinoHistorial } from '../entities/lote-destino-historial.entity';
import { LoteDestinoHistorialResponseDto } from '../dto/lote-destino-historial-response.dto';

export class LoteDestinoHistorialMapper {
  static toResponseDto(
    entity: LoteDestinoHistorial,
  ): LoteDestinoHistorialResponseDto {
    return {
      id: entity.id,
      loteId: entity.loteId,
      destinoProductivoId: entity.destinoProductivoId,
      destinoProductivoNombre: entity.destinoProductivo?.nombre,
      destinoAnteriorId: entity.destinoAnteriorId ?? null,
      destinoAnteriorNombre: entity.destinoAnterior?.nombre ?? null,
      usuarioId: entity.usuarioId,
      origen: entity.origen,
      recomendacionDestinoId: entity.recomendacionDestinoId ?? null,
      createdAt: entity.createdAt,
    };
  }

  static toResponseDtoList(
    entities: LoteDestinoHistorial[],
  ): LoteDestinoHistorialResponseDto[] {
    return entities.map((e) => this.toResponseDto(e));
  }
}