import { LoteDestinoHistorialMapper } from '../mappers/lote-destino-historial.mapper';
import { LoteDestinoHistorial } from '../entities/lote-destino-historial.entity';
import { OrigenLectura } from '../../lectura-sensor/enums/origen-lectura.enum';

describe('LoteDestinoHistorialMapper', () => {
  const fecha = new Date('2026-01-15T10:00:00.000Z');

  const crearEntidad = (
    overrides: Partial<LoteDestinoHistorial> = {},
  ): LoteDestinoHistorial =>
    ({
      id: 1,
      loteId: 2,
      destinoProductivoId: 3,
      destinoProductivo: {
        nombre: 'Leche',
      },
      destinoAnteriorId: 4,
      destinoAnterior: {
        nombre: 'Manteca',
      },
      usuarioId: 5,
      origen: Object.values(OrigenLectura)[0],
      recomendacionDestinoId: 6,
      createdAt: fecha,
      ...overrides,
    }) as LoteDestinoHistorial;

  describe('toResponseDto', () => {
    it('debe mapear correctamente todos los campos de la entidad', () => {
      const entity = crearEntidad();

      const resultado = LoteDestinoHistorialMapper.toResponseDto(entity);

      expect(resultado).toEqual({
        id: 1,
        loteId: 2,
        destinoProductivoId: 3,
        destinoProductivoNombre: 'Leche',
        destinoAnteriorId: 4,
        destinoAnteriorNombre: 'Manteca',
        usuarioId: 5,
        origen: entity.origen,
        recomendacionDestinoId: 6,
        createdAt: fecha,
      });
    });

    it('debe asignar null cuando destinoAnteriorId es undefined', () => {
      const entity = crearEntidad({
        destinoAnteriorId: undefined,
      });

      const resultado = LoteDestinoHistorialMapper.toResponseDto(entity);

      expect(resultado.destinoAnteriorId).toBeNull();
    });

    it('debe asignar null cuando destinoAnteriorId es null', () => {
      const entity = crearEntidad({
        destinoAnteriorId: null,
      });

      const resultado = LoteDestinoHistorialMapper.toResponseDto(entity);

      expect(resultado.destinoAnteriorId).toBeNull();
    });

    it('debe asignar null cuando destinoAnterior no existe', () => {
      const entity = crearEntidad({
        destinoAnterior: undefined,
      });

      const resultado = LoteDestinoHistorialMapper.toResponseDto(entity);

      expect(resultado.destinoAnteriorNombre).toBeNull();
    });

    it('debe asignar null cuando destinoAnterior.nombre es null', () => {
      const entity = crearEntidad({
        destinoAnterior: { nombre: null } as any,
      });

      const resultado = LoteDestinoHistorialMapper.toResponseDto(entity);

      expect(resultado.destinoAnteriorNombre).toBeNull();
    });

    it('debe asignar null cuando recomendacionDestinoId es undefined', () => {
      const entity = crearEntidad({
        recomendacionDestinoId: undefined,
      });

      const resultado = LoteDestinoHistorialMapper.toResponseDto(entity);

      expect(resultado.recomendacionDestinoId).toBeNull();
    });

    it('debe asignar null cuando recomendacionDestinoId es null', () => {
      const entity = crearEntidad({
        recomendacionDestinoId: null,
      });

      const resultado = LoteDestinoHistorialMapper.toResponseDto(entity);

      expect(resultado.recomendacionDestinoId).toBeNull();
    });

    it('debe dejar destinoProductivoNombre como undefined si no existe destinoProductivo', () => {
      const entity = crearEntidad({
        destinoProductivo: undefined,
      });

      const resultado = LoteDestinoHistorialMapper.toResponseDto(entity);

      expect(resultado.destinoProductivoNombre).toBeUndefined();
    });
  });

  describe('toResponseDtoList', () => {
    it('debe convertir una lista de entidades a DTOs', () => {
      const entities = [
        crearEntidad(),
        crearEntidad({
          id: 10,
          loteId: 20,
          destinoProductivoId: 30,
          destinoProductivo: { nombre: 'Crema' } as any,
        }),
      ];

      const resultado =
        LoteDestinoHistorialMapper.toResponseDtoList(entities);

      expect(resultado).toHaveLength(2);
      expect(resultado[0].id).toBe(1);
      expect(resultado[0].destinoProductivoNombre).toBe('Leche');
      expect(resultado[1].id).toBe(10);
      expect(resultado[1].destinoProductivoNombre).toBe('Crema');
    });

    it('debe devolver una lista vacía cuando no hay entidades', () => {
      const resultado =
        LoteDestinoHistorialMapper.toResponseDtoList([]);

      expect(resultado).toEqual([]);
    });
  });
});