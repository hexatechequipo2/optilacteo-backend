import { LoteConsumoMapper } from '../mappers/lote-consumo.mapper';
import { LoteConsumo } from '../entities/lote-consumo.entity';
import { LoteProduccion } from '../entities/lote-produccion.entity';

describe('LoteConsumoMapper', () => {
  afterEach(() => jest.clearAllMocks());

  describe('toResponseDto', () => {
    it('cuando se mapea un consumo, debe transformar las cantidades numéricas y mapear la lista de parámetros', () => {
      const mockConsumo: LoteConsumo = {
        id: 'consumo-uuid-1',
        loteIngresoId: 'lote-ingreso-1',
        loteProduccionId: 'lote-prod-1',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        cantidad: '250.75' as any,
        usuarioId: 'user-uuid-1',
        parametros: [
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          { parametro: 'Grasa', valor: '3.8' as any },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          { parametro: 'Proteína', valor: '3.2' as any },
        ],
        createdAt: new Date('2026-08-20'),
      } as unknown as LoteConsumo;

      const resultado = LoteConsumoMapper.toResponseDto(
        mockConsumo,
        'PROD-2026-A',
      );

      expect(resultado).toEqual({
        id: 'consumo-uuid-1',
        loteIngresoId: 'lote-ingreso-1',
        loteProduccionId: 'lote-prod-1',
        loteProduccionCodigo: 'PROD-2026-A',
        cantidad: 250.75,
        usuarioId: 'user-uuid-1',
        parametros: [
          { parametro: 'Grasa', valor: 3.8 },
          { parametro: 'Proteína', valor: 3.2 },
        ],
        createdAt: new Date('2026-08-20'),
      });
    });

    it('cuando los parámetros son nulos o undefined, debe retornar un array vacío de parámetros', () => {
      const mockConsumo: LoteConsumo = {
        id: 'consumo-uuid-2',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        cantidad: '100' as any,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        parametros: null as any,
      } as unknown as LoteConsumo;

      const resultado = LoteConsumoMapper.toResponseDto(
        mockConsumo,
        'PROD-2026-B',
      );

      expect(resultado.parametros).toEqual([]);
    });
  });

  describe('toResponseDtoList', () => {
    it('cuando se mapea una lista de consumos, debe resolver correctamente los códigos de lote de producción por defecto', () => {
      const mockConsumos: LoteConsumo[] = [
        {
          id: 'consumo-1',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          cantidad: '50' as any,
          loteProduccion: { codigo: 'LP-001' } as LoteProduccion,
        } as unknown as LoteConsumo,
        {
          id: 'consumo-2',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          cantidad: '100' as any,
          loteProduccion: undefined,
        } as unknown as LoteConsumo,
      ];

      const resultado = LoteConsumoMapper.toResponseDtoList(mockConsumos);

      expect(resultado).toHaveLength(2);
      expect(resultado[0].loteProduccionCodigo).toBe('LP-001');
      expect(resultado[1].loteProduccionCodigo).toBe('');
    });

    it('cuando se pasa una función personalizada para obtener el código, debe aplicarla a los lotes de producción', () => {
      const mockConsumos: LoteConsumo[] = [
        {
          id: 'consumo-1',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          cantidad: '50' as any,
          loteProduccion: { codigo: 'LP-001' } as LoteProduccion,
        } as unknown as LoteConsumo,
      ];
      const customGetCodigo = (lp: LoteProduccion) => `CUSTOM-${lp.codigo}`;

      const resultado = LoteConsumoMapper.toResponseDtoList(
        mockConsumos,
        customGetCodigo,
      );

      expect(resultado[0].loteProduccionCodigo).toBe('CUSTOM-LP-001');
    });
  });
});
