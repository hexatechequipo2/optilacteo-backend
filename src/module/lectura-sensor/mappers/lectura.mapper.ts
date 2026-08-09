import { SensorLectura } from '../entities/sensor-lectura.entity';
import { LecturaResponseDto } from '../dto/lectura-response.dto';
import { OrigenLectura } from '../enums/origen-lectura.enum';
import { EstadoMedicion } from '../enums/estado-medicion.enum';
import { LecturaHistorialItemDto } from '../dto/lectura-historial-item.dto';
import { UNIDAD_POR_PARAMETRO } from '../../config-parametro/validators/unidades-parametro.constant';

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

  static toHistorialItemDto(
    lectura: SensorLectura,
    estado: EstadoMedicion,
  ): LecturaHistorialItemDto {
    const dto = new LecturaHistorialItemDto();
    dto.id = lectura.id;
    dto.valor = lectura.valor;
    dto.unidad = UNIDAD_POR_PARAMETRO[lectura.sensor.parametro];
    dto.sensorNombre = lectura.sensor.nombre;
    dto.parametro = lectura.sensor.parametro;
    dto.loteCodigo = lectura.lote.codigo;
    dto.timestampLectura = lectura.timestampLectura;
    dto.estado = estado;
    return dto;
  }
}
