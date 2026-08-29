import { SkuMapper } from '../mappers/sku.mapper';
import { Sku } from '../entities/sku.entity';

describe('SkuMapper', () => {
  afterEach(() => jest.clearAllMocks());

  describe('toResponseDto', () => {
    it('cuando recibe una entidad Sku, debe retornar el DTO correspondiente', () => {
      const mockSku: Sku = {
        id: 'sku-uuid-1',
        empresaId: 'tenant-uuid-1',
        nombre: 'Leche Entera 1L',
        unidadMedida: 'LITROS',
        activo: true,
        createdAt: new Date('2026-08-20'),
      } as unknown as Sku;

      const resultado = SkuMapper.toResponseDto(mockSku);

      expect(resultado).toEqual({
        id: 'sku-uuid-1',
        empresaId: 'tenant-uuid-1',
        nombre: 'Leche Entera 1L',
        unidadMedida: 'LITROS',
        activo: true,
        createdAt: new Date('2026-08-20'),
      });
    });
  });

  describe('toResponseDtoList', () => {
    it('cuando recibe una lista de Skus, debe transformarlos a una lista de DTOs', () => {
      const mockSkus: Sku[] = [
        { id: 'sku-1', nombre: 'SKU 1' } as unknown as Sku,
        { id: 'sku-2', nombre: 'SKU 2' } as unknown as Sku,
      ];

      const resultado = SkuMapper.toResponseDtoList(mockSkus);

      expect(resultado).toHaveLength(2);
      expect(resultado[0].nombre).toBe('SKU 1');
      expect(resultado[1].nombre).toBe('SKU 2');
    });
  });
});
