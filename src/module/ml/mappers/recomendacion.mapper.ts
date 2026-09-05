import { RecomendacionDestino } from '../entities/recomendacion-destino.entity';
import { RecomendacionResponseDto } from '../dto/recomendacion-response.dto';
import { RecomendacionPendienteResponseDto } from '../dto/recomendacion-pendiente-response.dto';

export class RecomendacionMapper {
  static toResponseDto(
    recomendacion: RecomendacionDestino,
  ): RecomendacionResponseDto {
    return {
      id: recomendacion.id,
      destinoRecomendadoId: recomendacion.destinoRecomendadoId,
      destinoRecomendadoNombre: recomendacion.destinoRecomendado.nombre,
      confianza: recomendacion.confianza,
      estado: recomendacion.estado,
    };
  }

  // HU-49: GET puntual de la recomendación pendiente de un lote. A
  // diferencia de toResponseDto, trae destinoRecomendado/destinoReal como
  // objetos {id, nombre} (requiere las relaciones cargadas) en vez de un id
  // + nombre planos, para que el frontend no necesite un segundo llamado.
  static toPendienteResponseDto(
    recomendacion: RecomendacionDestino,
  ): RecomendacionPendienteResponseDto {
    return {
      id: recomendacion.id,
      destinoRecomendado: {
        id: recomendacion.destinoRecomendado.id,
        nombre: recomendacion.destinoRecomendado.nombre,
      },
      confianza: recomendacion.confianza,
      estado: recomendacion.estado,
      destinoReal: recomendacion.destinoReal
        ? {
            id: recomendacion.destinoReal.id,
            nombre: recomendacion.destinoReal.nombre,
          }
        : null,
    };
  }
}