import { SensorLectura } from '../entities/sensor-lectura.entity';
import { LecturaResponseDto } from '../dto/lectura-response.dto';
import { OrigenLectura } from '../enums/origen-lectura.enum';

export class LecturaMapper {
  static toEntity(
    sensorId: number,
    loteId: number,
    valor: number,
    timestampLectura: Date,
    empresaId: number,
    origen: OrigenLectura = OrigenLectura.SENSOR,
    usuarioId: number | null = null,
  ): SensorLectura {
    const lectura = new SensorLectura();
    lectura.sensorId = sensorId;
    lectura.loteId = loteId;
    lectura.valor = valor;
    lectura.timestampLectura = timestampLectura;
    lectura.empresaId = empresaId;
    lectura.origen = origen;
    lectura.usuarioId = usuarioId;
    return lectura;
  }

  static toResponseDto(lectura: SensorLectura): LecturaResponseDto {
    return {
      id: lectura.id,
      sensorId: lectura.sensorId,
      loteId: lectura.loteId,
      valor: lectura.valor,
      timestampLectura: lectura.timestampLectura,
      empresaId: lectura.empresaId,
      origen: lectura.origen,
      usuarioId: lectura.usuarioId ?? null,
      createdAt: lectura.createdAt,
    };
  }
}