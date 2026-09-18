import { SensorMapper } from '../mappers/sensor.mapper';
import { Sensor } from '../entities/sensor.entity';
import { SensorLoteHistorial } from '../entities/sensor-lote-historial.entity';
import { CreateSensorDto } from '../dto/create-sensor.dto';
import { EstadoSensor } from '../enums/estado-sensor.enum';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

describe('SensorMapper', () => {
  describe('toEntity', () => {
    it('debe mapear un CreateSensorDto a una instancia de la entidad Sensor', () => {
      const dto: CreateSensorDto = {
        nombre: 'Sensor de Humedad 1',
        tipo: 'DIGITAL' as any,
        parametro: 'HUMEDAD' as any,
        ubicacion: 'Cámara A' as any,
        marca: 'Marca Test',
        rangoMinFavor: 40,
        rangoMaxFavor: 80,
      };
      const empresaId = 10;

      const entity = SensorMapper.toEntity(dto, empresaId);

      expect(entity).toBeInstanceOf(Sensor);
      expect(entity.nombre).toBe(dto.nombre);
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
      tipo: 'ANALOGICO' as any,
      parametro: 'TEMPERATURA' as any,
      ubicacion: 'Siló 3',
      rangoMinFavor: 10,
      rangoMaxFavor: 35,
      umbralDesconexionMinutos: 45,
      estado: EstadoSensor.ACTIVO,
      ultimaLectura: mockDate,
      empresaId: 10,
      createdAt: mockDate,
      updatedAt: mockDate,
    } as unknown as Sensor;

    it('debe mapear la entidad Sensor a SensorResponseDto con loteActualId asignado', () => {
      const loteActualId = 55;

      const responseDto = SensorMapper.toResponseDto(
        sensorEntity,
        loteActualId,
      );

      expect(responseDto).toEqual({
        id: sensorEntity.id,
        nombre: sensorEntity.nombre,
        tipo: sensorEntity.tipo,
        parametro: sensorEntity.parametro,
        ubicacion: sensorEntity.ubicacion,
        rangoMinFavor: sensorEntity.rangoMinFavor,
        rangoMaxFavor: sensorEntity.rangoMaxFavor,
        umbralDesconexionMinutos: sensorEntity.umbralDesconexionMinutos,
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

    // HU-31: regresión — este campo se agregó por migración después de
    // escribirse el mapper original y quedó afuera de toResponseDto, por lo
    // que el PATCH persistía el valor en la DB pero el body de respuesta (y
    // cualquier GET posterior) nunca lo incluía.
    it('debe incluir umbralDesconexionMinutos en la respuesta cuando la entidad tiene un valor', () => {
      const responseDto = SensorMapper.toResponseDto(sensorEntity);

      expect(responseDto.umbralDesconexionMinutos).toBe(45);
    });

    it('debe incluir umbralDesconexionMinutos como null cuando la entidad no tiene override propio', () => {
      const sensorSinOverride = {
        ...sensorEntity,
        umbralDesconexionMinutos: null,
      } as unknown as Sensor;

      const responseDto = SensorMapper.toResponseDto(sensorSinOverride);

      expect(responseDto.umbralDesconexionMinutos).toBeNull();
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
        usuario: { id: 42, email: 'operario@optilacteo.com' },
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
        userEmail: 'operario@optilacteo.com',
        fecha: mockFecha,
      });
    });
  });
});
