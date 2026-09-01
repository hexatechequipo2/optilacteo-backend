import { SkuResponseDto } from '../dto/sku-response.dto';
import { UnidadMedidaSku } from '../enums/unidad-medida-sku.enum';

describe('SkuResponseDto', () => {
  it('debería permitir construir correctamente una respuesta de SKU activo', () => {
    const createdAt = new Date('2026-08-20T10:00:00');

    const dto = new SkuResponseDto();

    dto.id = 1;
    dto.empresaId = 10;
    dto.nombre = 'Leche Entera 1L';
    dto.unidadMedida = Object.values(UnidadMedidaSku)[0];
    dto.activo = true;
    dto.createdAt = createdAt;

    expect(dto).toEqual({
      id: 1,
      empresaId: 10,
      nombre: 'Leche Entera 1L',
      unidadMedida: dto.unidadMedida,
      activo: true,
      createdAt,
    });
  });

  it('debería permitir representar un SKU inactivo', () => {
    const dto = new SkuResponseDto();

    dto.id = 2;
    dto.empresaId = 10;
    dto.nombre = 'Yogur Natural';
    dto.unidadMedida = Object.values(UnidadMedidaSku)[0];
    dto.activo = false;
    dto.createdAt = new Date();

    expect(dto.activo).toBe(false);
  });
});
