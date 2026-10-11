import { ProveedorEstabilidad, DetalleEstabilidad } from '../entities/proveedor-estabilidad.entity';

describe('ProveedorEstabilidad Entity', () => {
  it('debe crear una instancia válida de ProveedorEstabilidad con todos sus campos', () => {
    const entity = new ProveedorEstabilidad();
    const ahora = new Date();
    const detalleMock: DetalleEstabilidad[] = [
      {
        parametro: 'GRASA',
        materiaPrima: 'LECHE_ENTERA',
        n: 10,
        media: 3.5,
        desvio: 0.12,
        desvioNormalizado: 0.034,
        clasificacion: 'ESTABLE',
      },
    ];

    entity.id = 1;
    entity.proveedorId = 10;
    entity.empresaId = 100;
    entity.status = 'ok';
    entity.clasificacion = 'ESTABLE';
    entity.score = '0.9500';
    entity.detalle = detalleMock;
    entity.cantidadLotes = 10;
    entity.modeloVersion = 'v1.0.0';
    entity.calculadoEn = ahora;

    expect(entity).toBeDefined();
    expect(entity.id).toBe(1);
    expect(entity.proveedorId).toBe(10);
    expect(entity.empresaId).toBe(100);
    expect(entity.status).toBe('ok');
    expect(entity.clasificacion).toBe('ESTABLE');
    expect(entity.score).toBe('0.9500');
    expect(entity.detalle).toEqual(detalleMock);
    expect(entity.cantidadLotes).toBe(10);
    expect(entity.modeloVersion).toBe('v1.0.0');
    expect(entity.calculadoEn).toBe(ahora);
  });

  it('debe ser compatible con valores nulos en propiedades opcionales para status "insufficient_data"', () => {
    const entity = new ProveedorEstabilidad();

    entity.proveedorId = 12;
    entity.empresaId = 100;
    entity.status = 'insufficient_data';
    entity.clasificacion = null;
    entity.score = null;
    entity.detalle = [];
    entity.cantidadLotes = 2;
    entity.modeloVersion = null;

    expect(entity.status).toBe('insufficient_data');
    expect(entity.clasificacion).toBeNull();
    expect(entity.score).toBeNull();
    expect(entity.detalle).toEqual([]);
    expect(entity.modeloVersion).toBeNull();
  });
});