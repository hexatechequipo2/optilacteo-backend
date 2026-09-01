import {
  DesvioParametroDto,
  DesvioProveedorResponseDto,
} from '../dto/desvio-proveedor-response.dto';

import { Parametro } from '../../config-parametro/enums/parametro.enum';

describe('DesvioProveedorResponseDto', () => {
  it('debería permitir construir correctamente un desvío de parámetro', () => {
    const parametro = new DesvioParametroDto();

    parametro.parametro = Object.values(Parametro)[0];
    parametro.valorComprometido = 10;
    parametro.valorReal = 12;
    parametro.desvioPorcentaje = 20;

    expect(parametro.valorComprometido).toBe(10);
    expect(parametro.valorReal).toBe(12);
    expect(parametro.desvioPorcentaje).toBe(20);
  });

  it('debería permitir construir correctamente la respuesta de desvío del proveedor', () => {
    const response = new DesvioProveedorResponseDto();

    response.loteId = 1;
    response.codigo = 'LOT-001';
    response.fechaIngreso = new Date('2026-08-20');

    response.cantidadComprometidaKg = 1000;
    response.cantidadReal = 1100;
    response.desvioCantidadPorcentaje = 10;

    response.parametros = [];

    expect(response).toEqual({
      loteId: 1,
      codigo: 'LOT-001',
      fechaIngreso: new Date('2026-08-20'),
      cantidadComprometidaKg: 1000,
      cantidadReal: 1100,
      desvioCantidadPorcentaje: 10,
      parametros: [],
    });
  });

  it('debería permitir valores null en los campos opcionales de cantidad', () => {
    const response = new DesvioProveedorResponseDto();

    response.loteId = 1;
    response.codigo = 'LOT-001';
    response.fechaIngreso = new Date();
    response.cantidadComprometidaKg = null;
    response.cantidadReal = null;
    response.desvioCantidadPorcentaje = null;
    response.parametros = [];

    expect(response.cantidadComprometidaKg).toBeNull();
    expect(response.cantidadReal).toBeNull();
    expect(response.desvioCantidadPorcentaje).toBeNull();
  });
});
