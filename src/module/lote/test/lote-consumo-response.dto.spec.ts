import {
  LoteConsumoParametroResponseDto,
  LoteConsumoResponseDto,
  LoteProduccionResponseDto,
} from '../dto/lote-consumo-response.dto';

import { Parametro } from '../../config-parametro/enums/parametro.enum';

describe('LoteConsumoParametroResponseDto', () => {
  it('debería permitir construir correctamente un parámetro de consumo', () => {
    const dto = new LoteConsumoParametroResponseDto();

    dto.parametro = Object.values(Parametro)[0];
    dto.valor = 25.5;

    expect(dto.parametro).toBeDefined();
    expect(dto.valor).toBe(25.5);
  });
});

describe('LoteConsumoResponseDto', () => {
  it('debería permitir construir correctamente una respuesta de consumo', () => {
    const parametro = new LoteConsumoParametroResponseDto();
    parametro.parametro = Object.values(Parametro)[0];
    parametro.valor = 3.5;

    const createdAt = new Date('2026-08-20T10:00:00');

    const dto = new LoteConsumoResponseDto();

    dto.id = 1;
    dto.loteIngresoId = 10;
    dto.loteProduccionId = 20;
    dto.loteProduccionCodigo = 'PROD-1-00001';
    dto.cantidad = 100;
    dto.usuarioId = 5;
    dto.parametros = [parametro];
    dto.createdAt = createdAt;

    expect(dto).toEqual({
      id: 1,
      loteIngresoId: 10,
      loteProduccionId: 20,
      loteProduccionCodigo: 'PROD-1-00001',
      cantidad: 100,
      usuarioId: 5,
      parametros: [
        {
          parametro: parametro.parametro,
          valor: 3.5,
        },
      ],
      createdAt,
    });
  });

  it('debería permitir una lista vacía de parámetros', () => {
    const dto = new LoteConsumoResponseDto();

    dto.id = 1;
    dto.loteIngresoId = 10;
    dto.loteProduccionId = 20;
    dto.loteProduccionCodigo = 'PROD-1-00001';
    dto.cantidad = 100;
    dto.usuarioId = 5;
    dto.parametros = [];
    dto.createdAt = new Date();

    expect(dto.parametros).toEqual([]);
  });
});

describe('LoteProduccionResponseDto', () => {
  it('debería permitir construir correctamente una respuesta de lote de producción', () => {
    const createdAt = new Date('2026-08-20T10:00:00');

    const dto = new LoteProduccionResponseDto();

    dto.id = 1;
    dto.codigo = 'PROD-1-00001';
    dto.createdAt = createdAt;

    expect(dto).toEqual({
      id: 1,
      codigo: 'PROD-1-00001',
      createdAt,
    });
  });
});
