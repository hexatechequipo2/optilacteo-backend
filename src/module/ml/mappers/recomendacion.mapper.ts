import { RecomendacionDestino } from '../entities/recomendacion-destino.entity';
import { RecomendacionResponseDto } from '../dto/recomendacion-response.dto';

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
}