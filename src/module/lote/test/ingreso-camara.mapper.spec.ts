import { IngresoCamaraMapper } from '../mappers/ingreso-camara.mapper';
import { IngresoCamara } from '../entities/ingreso-camara.entity';

describe('IngresoCamaraMapper', () => {
  afterEach(() => jest.clearAllMocks());

  describe('toResponseDto', () => {
    it('cuando se mapea un IngresoCamara completo, debe retornar el DTO con los tipos formateados correctamente', () => {
      const mockIngreso: IngresoCamara = {
        id: 'ingreso-uuid-1',
        empresaId: 'tenant-uuid-1',
        skuId: 'sku-uuid-1',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        sku: { id: 'sku-uuid-1', nombre: 'Queso Cremoso' } as any,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        cantidad: '150.50' as any, // Simulamos tipo decimal que TypeORM/Postgres devuelve como string
        loteId: 'lote-uuid-1',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        lote: { id: 'lote-uuid-1', codigo: 'LOT-2026-001' } as any,
        fechaIngreso: new Date('2026-08-20'),
        createdAt: new Date('2026-08-20'),
      } as unknown as IngresoCamara;

      const resultado = IngresoCamaraMapper.toResponseDto(mockIngreso);

      expect(resultado).toEqual({
        id: 'ingreso-uuid-1',
        empresaId: 'tenant-uuid-1',
        skuId: 'sku-uuid-1',
        skuNombre: 'Queso Cremoso',
        cantidad: 150.5,
        loteId: 'lote-uuid-1',
        loteCodigo: 'LOT-2026-001',
        fechaIngreso: new Date('2026-08-20'),
        createdAt: new Date('2026-08-20'),
      });
    });

    it('cuando el ingreso no tiene lote ni sku asociados, debe retornar valores nulos o undefined en sus campos derivados', () => {
      const mockIngreso: IngresoCamara = {
        id: 'ingreso-uuid-2',
        empresaId: 'tenant-uuid-1',
        skuId: 'sku-uuid-2',
        sku: undefined,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        cantidad: '50' as any,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        loteId: null as any,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        lote: null as any,
        fechaIngreso: new Date('2026-08-20'),
        createdAt: new Date('2026-08-20'),
      } as unknown as IngresoCamara;

      // Act
      const resultado = IngresoCamaraMapper.toResponseDto(mockIngreso);

      expect(resultado.skuNombre).toBeUndefined();
      expect(resultado.loteId).toBeNull();
      expect(resultado.loteCodigo).toBeNull();
      expect(resultado.cantidad).toBe(50);
    });
  });

  describe('toResponseDtoList', () => {
    it('cuando recibe una lista de entidad IngresoCamara, debe transformar cada elemento a DTO', () => {
      const mockIngresos: IngresoCamara[] = [
        {
          id: 'ingreso-1',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          cantidad: '10' as any,
          sku: { nombre: 'SKU 1' },
        } as unknown as IngresoCamara,
        {
          id: 'ingreso-2',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          cantidad: '20' as any,
          sku: { nombre: 'SKU 2' },
        } as unknown as IngresoCamara,
      ];

      const resultado = IngresoCamaraMapper.toResponseDtoList(mockIngresos);

      expect(resultado).toHaveLength(2);
      expect(resultado[0].id).toBe('ingreso-1');
      expect(resultado[0].cantidad).toBe(10);
      expect(resultado[1].id).toBe('ingreso-2');
      expect(resultado[1].cantidad).toBe(20);
    });
  });
});
