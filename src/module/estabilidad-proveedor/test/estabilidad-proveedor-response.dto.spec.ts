import { EstabilidadProveedorResponseDto } from '../dto/estabilidad-proveedor-response.dto';
import type { DetalleEstabilidad } from '../entities/proveedor-estabilidad.entity';

describe('EstabilidadProveedorResponseDto', () => {
  it('debe permitir instanciar una respuesta válida con estado "ok"', () => {
    const dto = new EstabilidadProveedorResponseDto();
    const fechaActual = new Date();
    const detallesMock: DetalleEstabilidad[] = [
      {
        parametro: 'GRASA',
        materiaPrima: 'LECHE_ENTERA',
        promedio: 3.5,
        desviacionEstandar: 0.1,
      } as any,
    ];

    dto.status = 'ok';
    dto.clasificacion = 'ESTABLE';
    dto.score = 0.95;
    dto.detalle = detallesMock;
    dto.cantidadLotes = 15;
    dto.calculadoEn = fechaActual;

    expect(dto).toBeDefined();
    expect(dto.status).toBe('ok');
    expect(dto.clasificacion).toBe('ESTABLE');
    expect(dto.score).toBe(0.95);
    expect(dto.detalle).toEqual(detallesMock);
    expect(dto.cantidadLotes).toBe(15);
    expect(dto.calculadoEn).toBe(fechaActual);
  });

  it('debe permitir instanciar una respuesta válida para estado "insufficient_data"', () => {
    const dto = new EstabilidadProveedorResponseDto();

    dto.status = 'insufficient_data';
    dto.mensaje = 'Sin datos suficientes';
    dto.cantidadLotes = 2;
    dto.minimoLotes = 5;

    expect(dto).toBeDefined();
    expect(dto.status).toBe('insufficient_data');
    expect(dto.mensaje).toBe('Sin datos suficientes');
    expect(dto.cantidadLotes).toBe(2);
    expect(dto.minimoLotes).toBe(5);
    expect(dto.clasificacion).toBeUndefined();
    expect(dto.score).toBeUndefined();
  });
});