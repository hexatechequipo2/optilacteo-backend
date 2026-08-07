import { SensorMapper } from '../mappers/sensor.mapper';
import { Sensor } from '../entities/sensor.entity';
import { SensorLoteHistorial } from '../entities/sensor-lote-historial.entity';
import { CreateSensorDto } from '../dto/create-sensor.dto';
import { EstadoSensor } from '../enums/estado-sensor.enum';

describe('SensorMapper', () => {
  describe('toEntity', () => {
    it('debe mapear un CreateSensorDto a una instancia de la entidad Sensor', () => {
      const dto: CreateSensorDto = {
        nombre: 'Sensor de Humedad 1',
        marca: 'Siemens',
        tipo: 'DIGITAL' as any,
        parametro: 'HUMEDAD' as any,
        ubicacion: 'Cámara A' as any,
        rangoMinFavor: 40,
        rangoMaxFavor: 80,
      };
      const empresaId = 10;

      const entity = SensorMapper.toEntity(dto, empresaId);

      expect(entity).toBeInstanceOf(Sensor);
      expect(entity.nombre).toBe(dto.nombre);
      expect(entity.marca).toBe(dto.marca);
      expect(entity.tipo).toBe(dto.tipo);
      expect(entity.parametro).toBe(dto.parametro);
      expect(entity.ubicacion).toBe(dto.ubicacion);
      expect(entity.rangoMinFavor).toBe(dto.rangoMinFavor);
      expect(entity.rangoMaxFavor).toBe(dto.rangoMaxFavor);
      expect(entity.empresaId).toBe(empresaId);
    });
  });

  describe('toResponseDto', () => {
    const mockDate = new Date();
    const sensorEntity: Sensor = {
      id: 1,
      nombre: 'Sensor de Temperatura',
      marca: 'Endress+Hauser',
      tipo: 'ANALOGICO' as any,
      parametro: 'TEMPERATURA' as any,
      ubicacion: 'Siló 3',
      rangoMinFavor: 10,
      rangoMaxFavor: 35,
      estado: EstadoSensor.ACTIVO,
      ultimaLectura: mockDate,
      empresaId: 10,
      createdAt: mockDate,
      updatedAt: mockDate,
    } as unknown as Sensor;

    it('debe mapear la entidad Sensor a SensorResponseDto con loteActualId asignado', () => {
      const loteActualId = 55;

      const responseDto = SensorMapper.toResponseDto(sensorEntity, loteActualId);

      expect(responseDto).toEqual({
        id: sensorEntity.id,
        nombre: sensorEntity.nombre,
        marca: sensorEntity.marca,
        tipo: sensorEntity.tipo,
        parametro: sensorEntity.parametro,
        ubicacion: sensorEntity.ubicacion,
        rangoMinFavor: sensorEntity.rangoMinFavor,
        rangoMaxFavor: sensorEntity.rangoMaxFavor,
        estado: sensorEntity.estado,
        ultimaLectura: sensorEntity.ultimaLectura,
        loteActualId: 55,
        empresaId: sensorEntity.empresaId,
        createdAt: sensorEntity.createdAt,
        updatedAt: sensorEntity.updatedAt,
      });
    });

    it('debe mapear loteActualId como null por defecto si no se especifica', () => {
      const responseDto = SensorMapper.toResponseDto(sensorEntity);

      expect(responseDto.loteActualId).toBeNull();
    });
  });

  describe('historialToResponseDto', () => {
    it('debe mapear la entidad SensorLoteHistorial a SensorLoteHistorialResponseDto', () => {
      const mockFecha = new Date();
      const historialEntity: SensorLoteHistorial = {
        id: 100,
        sensorId: 1,
        loteIdAnterior: 5,
        loteIdNuevo: 12,
        userId: 42,
        empresaId: 10,
        fecha: mockFecha,
      } as SensorLoteHistorial;

      const responseDto = SensorMapper.historialToResponseDto(historialEntity);

      expect(responseDto).toEqual({
        id: 100,
        sensorId: 1,
        loteIdAnterior: 5,
        loteIdNuevo: 12,
        userId: 42,
        fecha: mockFecha,
      });
    });
  });
});