import { LecturaMapper } from '../mappers/lectura.mapper';
import { OrigenLectura } from '../enums/origen-lectura.enum';
import { EstadoMedicion } from '../enums/estado-medicion.enum';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

describe('LecturaMapper', () => {
  describe('toEntity', () => {
    it('debe mapear correctamente una lectura con origen SENSOR', () => {
      const fecha = new Date('2026-01-01T10:00:00.000Z');

      const entity = LecturaMapper.toEntity(1, 2, 7.5, fecha, 10);

      expect(entity.sensorId).toBe(1);
      expect(entity.loteId).toBe(2);
      expect(entity.valor).toBe(7.5);
      expect(entity.timestampLectura).toBe(fecha);
      expect(entity.empresaId).toBe(10);
      expect(entity.origen).toBe(OrigenLectura.SENSOR);
      expect(entity.usuarioId).toBeNull();
    });

    it('debe mapear correctamente una lectura manual', () => {
      const fecha = new Date();

      const entity = LecturaMapper.toEntity(
        3,
        4,
        15,
        fecha,
        20,
        OrigenLectura.MANUAL,
        99,
      );

      expect(entity.sensorId).toBe(3);
      expect(entity.loteId).toBe(4);
      expect(entity.valor).toBe(15);
      expect(entity.timestampLectura).toBe(fecha);
      expect(entity.empresaId).toBe(20);
      expect(entity.origen).toBe(OrigenLectura.MANUAL);
      expect(entity.usuarioId).toBe(99);
    });
  });

  describe('toResponseDto', () => {
    it('debe convertir correctamente una entidad en DTO', () => {
      const lectura: any = {
        id: 5,
        sensorId: 2,
        loteId: 9,
        valor: 6.9,
        timestampLectura: new Date('2026-01-01T12:00:00.000Z'),
        empresaId: 3,
        origen: OrigenLectura.SENSOR,
        usuarioId: null,
        createdAt: new Date('2026-01-01T12:01:00.000Z'),
      };

      const dto = LecturaMapper.toResponseDto(lectura);

      expect(dto).toEqual({
        id: lectura.id,
        sensorId: lectura.sensorId,
        loteId: lectura.loteId,
        valor: lectura.valor,
        timestampLectura: lectura.timestampLectura,
        empresaId: lectura.empresaId,
        origen: lectura.origen,
        usuarioId: null,
        createdAt: lectura.createdAt,
      });
    });

    it('debe mantener el usuarioId cuando existe', () => {
      const lectura: any = {
        id: 1,
        sensorId: 1,
        loteId: 1,
        valor: 7,
        timestampLectura: new Date(),
        empresaId: 1,
        origen: OrigenLectura.MANUAL,
        usuarioId: 55,
        createdAt: new Date(),
      };

      const dto = LecturaMapper.toResponseDto(lectura);

      expect(dto.usuarioId).toBe(55);
    });
  });

  describe('toHistorialItemDto', () => {
    it('debe mapear correctamente una lectura del historial', () => {
      const lectura: any = {
        id: 7,
        valor: 6.8,
        timestampLectura: new Date('2026-01-01T13:00:00.000Z'),
        sensor: {
          nombre: 'Sensor PH',
          parametro: Parametro.PH,
        },
        lote: {
          codigo: 'LOTE-001',
        },
      };

      const dto = LecturaMapper.toHistorialItemDto(
        lectura,
        EstadoMedicion.NORMAL,
      );

      expect(dto.id).toBe(7);
      expect(dto.valor).toBe(6.8);

      expect(dto.unidad).toBeDefined();

      expect(dto.sensorNombre).toBe('Sensor PH');
      expect(dto.parametro).toBe(Parametro.PH);
      expect(dto.loteCodigo).toBe('LOTE-001');
      expect(dto.timestampLectura).toEqual(
        new Date('2026-01-01T13:00:00.000Z'),
      );
      expect(dto.estado).toBe(EstadoMedicion.NORMAL);
    });

    it('debe conservar el estado recibido', () => {
      const lectura: any = {
        id: 1,
        valor: 15,
        timestampLectura: new Date(),
        sensor: {
          nombre: 'Sensor',
          parametro: Parametro.PH,
        },
        lote: {
          codigo: 'L1',
        },
      };

      const dto = LecturaMapper.toHistorialItemDto(
        lectura,
        EstadoMedicion.FUERA_DE_RANGO,
      );

      expect(dto.estado).toBe(EstadoMedicion.FUERA_DE_RANGO);
    });
  });
});
