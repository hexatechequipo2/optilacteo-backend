import { LoteMapper } from '../mappers/lote.mapper';
import { Lote } from '../entities/lote.entity';

describe('LoteMapper', () => {
  afterEach(() => jest.clearAllMocks());

  describe('toResponseDto', () => {
    it('cuando el lote tiene todos sus campos completos, debe hacer el parsing numérico de todos los datos', () => {
      const mockLote: Lote = {
        id: 'lote-1',
        codigo: 'LOT-100',
        empresaId: 'tenant-1',
        proveedorId: 'prov-1',
        tamboId: 'tambo-1',
        materiaPrima: 'Leche Cruda',
        fechaIngreso: new Date('2026-08-20'),
        clasificacion: 'A',
        destinoInicial: 'Silo 1',
        ubicacionInicial: 'Planta A',
        estado: 'INGRESADO',
        rendimiento: '95.5' as any,
        unidadRendimiento: '%',
        cantidad: '1000' as any,
        cantidadDisponible: '800' as any,
        cantidadComprometidaKg: '200' as any,
        parametros: [
          { parametro: 'Temperatura', valor: '4.5' as any, valorComprometido: '5.0' as any },
        ],
        createdAt: new Date('2026-08-20'),
      } as unknown as Lote;

      const resultado = LoteMapper.toResponseDto(mockLote);

      expect(resultado.tamboId).toBe('tambo-1');
      expect(resultado.rendimiento).toBe(95.5);
      expect(resultado.cantidad).toBe(1000);
      expect(resultado.cantidadDisponible).toBe(800);
      expect(resultado.cantidadComprometidaKg).toBe(200);
      expect(resultado.parametros[0]).toEqual({
        parametro: 'Temperatura',
        valor: 4.5,
        valorComprometido: 5.0,
      });
    });

    it('cuando el lote tiene campos opcionales/nulos, debe asignar nulls adecuadamente', () => {
      const mockLote: Lote = {
        id: 'lote-2',
        clasificacion: undefined,
        destinoInicial: undefined,
        ubicacionInicial: undefined,
        rendimiento: null,
        unidadRendimiento: undefined,
        cantidad: null,
        cantidadDisponible: null,
        cantidadComprometidaKg: null,
        parametros: [
          { parametro: 'Acidez', valor: '15' as any, valorComprometido: null },
        ],
      } as unknown as Lote;

      const resultado = LoteMapper.toResponseDto(mockLote);

      expect(resultado.clasificacion).toBeNull();
      expect(resultado.rendimiento).toBeNull();
      expect(resultado.cantidad).toBeNull();
      expect(resultado.cantidadDisponible).toBeNull();
      expect(resultado.cantidadComprometidaKg).toBeNull();
      expect(resultado.parametros[0].valorComprometido).toBeNull();
    });
  });

  describe('toDesvioResponseDto', () => {
    it('cuando hay valores válidos de comprometido y real, debe calcular el porcentaje de desvío con 2 decimales', () => {
      const mockLote: Lote = {
        id: 'lote-desvio-1',
        codigo: 'LOT-DESV-01',
        fechaIngreso: new Date('2026-08-20'),
        cantidadComprometidaKg: '1000' as any,
        cantidad: '1050' as any, // 5% de desvío positivo: ((1050 - 1000) / 1000) * 100 = 5
        parametros: [
          {
            parametro: 'Grasa',
            valorComprometido: '3.5' as any,
            valor: '3.7' as any, // ((3.7 - 3.5)/3.5)*100 = 5.7142... -> 5.71
          },
        ],
      } as unknown as Lote;

      const resultado = LoteMapper.toDesvioResponseDto(mockLote);

      expect(resultado.desvioCantidadPorcentaje).toBe(5);
      expect(resultado.parametros).toHaveLength(1);
      expect(resultado.parametros[0]).toEqual({
        parametro: 'Grasa',
        valorComprometido: 3.5,
        valorReal: 3.7,
        desvioPorcentaje: 5.71,
      });
    });

    it('cuando cantidadComprometida es nula o 0, el desvío general debe ser null', () => {
      const mockLote: Lote = {
        id: 'lote-desvio-2',
        cantidadComprometidaKg: null,
        cantidad: '1000' as any,
        parametros: [],
      } as unknown as Lote;

      const resultado = LoteMapper.toDesvioResponseDto(mockLote);

      expect(resultado.desvioCantidadPorcentaje).toBeNull();
    });

    it('debe filtrar los parámetros que no posean valorComprometido', () => {
      const mockLote: Lote = {
        id: 'lote-desvio-3',
        parametros: [
          { parametro: 'PH', valorComprometido: null, valor: '6.6' as any },
          { parametro: 'Grasa', valorComprometido: '3.0' as any, valor: '3.0' as any },
        ],
      } as unknown as Lote;

      const resultado = LoteMapper.toDesvioResponseDto(mockLote);

      expect(resultado.parametros).toHaveLength(1);
      expect(resultado.parametros[0].parametro).toBe('Grasa');
      expect(resultado.parametros[0].desvioPorcentaje).toBe(0);
    });
  });

  describe('toResponseDtoList y toDesvioResponseDtoList', () => {
    it('debe mapear correctamente las listas para ambos métodos', () => {
      const mockLotes = [{ id: 'l1' }, { id: 'l2' }] as unknown as Lote[];

      const listNormal = LoteMapper.toResponseDtoList(mockLotes);
      const listDesvios = LoteMapper.toDesvioResponseDtoList(mockLotes);

      expect(listNormal).toHaveLength(2);
      expect(listDesvios).toHaveLength(2);
    });
  });
});