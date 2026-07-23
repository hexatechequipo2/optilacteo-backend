import { Sensor } from '../entities/sensor.entity';
import { SensorLoteHistorial } from '../entities/sensor-lote-historial.entity';
import { CreateSensorDto } from '../dto/create-sensor.dto';
import { SensorResponseDto } from '../dto/sensor-response.dto';
import { SensorLoteHistorialResponseDto } from '../dto/sensor-lote-historial-response.dto';

export class SensorMapper {
  static toEntity(dto: CreateSensorDto, empresaId: number): Sensor {
    const sensor = new Sensor();
    sensor.nombre = dto.nombre;
    sensor.tipo = dto.tipo;
    sensor.parametro = dto.parametro;
    sensor.ubicacion = dto.ubicacion;
    sensor.rangoMinFavor = dto.rangoMinFavor;
    sensor.rangoMaxFavor = dto.rangoMaxFavor;
    sensor.empresaId = empresaId;
    return sensor;
  }

  // loteActualId se pasa aparte porque no vive en la entity Sensor.
  static toResponseDto(sensor: Sensor, loteActualId: number | null = null): SensorResponseDto {
    return {
      id: sensor.id,
      nombre: sensor.nombre,
      tipo: sensor.tipo,
      parametro: sensor.parametro,
      ubicacion: sensor.ubicacion,
      rangoMinFavor: sensor.rangoMinFavor,
      rangoMaxFavor: sensor.rangoMaxFavor,
      estado: sensor.estado,
      ultimaLectura: sensor.ultimaLectura,
      loteActualId,
      empresaId: sensor.empresaId,
      createdAt: sensor.createdAt,
      updatedAt: sensor.updatedAt,
    };
  }

  static historialToResponseDto(h: SensorLoteHistorial): SensorLoteHistorialResponseDto {
    return {
      id: h.id,
      sensorId: h.sensorId,
      loteIdAnterior: h.loteIdAnterior,
      loteIdNuevo: h.loteIdNuevo,
      userId: h.userId,
      fecha: h.fecha,
    };
  }
}