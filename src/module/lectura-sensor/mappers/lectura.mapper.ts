import { SensorLectura } from '../entities/sensor-lectura.entity';
import { LecturaResponseDto } from '../dto/lectura-response.dto';

export class LecturaMapper {
  static toEntity(
    sensorId: number,
    loteId: number,
    valor: number,
    timestampLectura: Date,
    empresaId: number,
  ): SensorLectura {
    const lectura = new SensorLectura();
    lectura.sensorId = sensorId;
    lectura.loteId = loteId;
    lectura.valor = valor;
    lectura.timestampLectura = timestampLectura;
    lectura.empresaId = empresaId;
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
      createdAt: lectura.createdAt,
    };
  }
}
