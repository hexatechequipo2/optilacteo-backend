import { IngresoCamaraResponseDto } from '../dto/ingreso-camara-response.dto';

describe('IngresoCamaraResponseDto', () => {
  it('debería permitir construir una respuesta completa con SKU y lote', () => {
    const dto = new IngresoCamaraResponseDto();

    dto.id = 1;
    dto.empresaId = 10;

    dto.skuId = 5;
    dto.skuNombre = 'Leche Entera 1L';

    dto.cantidad = 100;

    dto.loteId = 20;
    dto.loteCodigo = 'LOT-001';

    dto.fechaIngreso = new Date('2026-08-20T10:00:00');
    dto.createdAt = new Date('2026-08-20T10:30:00');

    expect(dto).toEqual({
      id: 1,
      empresaId: 10,
      skuId: 5,
      skuNombre: 'Leche Entera 1L',
      cantidad: 100,
      loteId: 20,
      loteCodigo: 'LOT-001',
      fechaIngreso: new Date('2026-08-20T10:00:00'),
      createdAt: new Date('2026-08-20T10:30:00'),
    });
  });

  it('debería permitir un ingreso a cámara sin lote asociado', () => {
    const dto = new IngresoCamaraResponseDto();

    dto.id = 1;
    dto.empresaId = 10;
    dto.skuId = 5;
    dto.cantidad = 100;
    dto.loteId = null;
    dto.loteCodigo = null;
    dto.fechaIngreso = new Date();
    dto.createdAt = new Date();

    expect(dto.loteId).toBeNull();
    expect(dto.loteCodigo).toBeNull();
  });

  it('debería permitir que skuNombre sea opcional', () => {
    const dto = new IngresoCamaraResponseDto();

    dto.id = 1;
    dto.empresaId = 10;
    dto.skuId = 5;
    dto.cantidad = 100;
    dto.fechaIngreso = new Date();
    dto.createdAt = new Date();

    expect(dto.skuNombre).toBeUndefined();
  });
});