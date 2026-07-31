import { ComparacionHistoricaMapper } from '../mappers/comparacion-historica.mapper';
import { Lote } from '../entities/lote.entity';
import { ConfiguracionComparacionHistoricaDto } from '../../config-parametro/configuracion-comparacion-historica.service';

describe('ComparacionHistoricaMapper', () => {
  const mockConfig: ConfiguracionComparacionHistoricaDto = {
    cantidadRegistrosHistoricos: 5,
    desvioSignificativoPorcentaje: 10,
  };

  it('debe calcular correctamente los promedios, desviaciones y detectar desvíos significativos', () => {
    const mockLoteActual = {
      id: 10,
      parametros: [
        { parametro: 'HUMEDAD', valor: 15 }, // Promedio será 10 -> Desviación: +50% (supera 10%)
        { parametro: 'GRASA', valor: 3.8 },  // Promedio será 4.0 -> Desviación: -5% (no supera)
      ],
    } as unknown as Lote;

    const mockHistoricos = [
      {
        id: 1,
        parametros: [
          { parametro: 'HUMEDAD', valor: 8 },
          { parametro: 'GRASA', valor: 4.0 },
        ],
      },
      {
        id: 2,
        parametros: [
          { parametro: 'HUMEDAD', valor: 12 },
          { parametro: 'GRASA', valor: 4.0 },
        ],
      },
    ] as unknown as Lote[];

    const resultado = ComparacionHistoricaMapper.build(
      mockLoteActual,
      mockHistoricos,
      mockConfig,
    );

    expect(resultado).toEqual({
      loteId: 10,
      cantidadLotesHistoricosUtilizados: 2,
      cantidadLotesHistoricosConfigurada: 5,
      desvioSignificativoPorcentaje: 10,
      parametros: [
        {
          parametro: 'HUMEDAD',
          valorLote: 15,
          promedioHistorico: 10,
          desviacionPorcentual: 50,
          superaDesvioSignificativo: true,
        },
        {
          parametro: 'GRASA',
          valorLote: 3.8,
          promedioHistorico: 4.0,
          desviacionPorcentual: -5,
          superaDesvioSignificativo: false,
        },
      ],
    });
  });

  it('debe manejar el caso donde no hay lotes históricos registrados', () => {
    const mockLoteActual = {
      id: 11,
      parametros: [{ parametro: 'PH', valor: 6.5 }],
    } as unknown as Lote;

    const resultado = ComparacionHistoricaMapper.build(
      mockLoteActual,
      [],
      mockConfig,
    );

    expect(resultado.cantidadLotesHistoricosUtilizados).toBe(0);
    expect(resultado.parametros).toHaveLength(1);
    expect(resultado.parametros[0]).toEqual({
      parametro: 'PH',
      valorLote: 6.5,
      promedioHistorico: 0,
      desviacionPorcentual: 0,
      superaDesvioSignificativo: false,
    });
  });

  it('debe asignar 0 a desviacionPorcentual si el promedio histórico es 0 para evitar división por cero', () => {
    const mockLoteActual = {
      id: 12,
      parametros: [{ parametro: 'PROTEINA', valor: 3.2 }],
    } as unknown as Lote;

    const mockHistoricos = [
      {
        id: 1,
        parametros: [{ parametro: 'PROTEINA', valor: 0 }],
      },
    ] as unknown as Lote[];

    const resultado = ComparacionHistoricaMapper.build(
      mockLoteActual,
      mockHistoricos,
      mockConfig,
    );

    expect(resultado.parametros[0]).toEqual({
      parametro: 'PROTEINA',
      valorLote: 3.2,
      promedioHistorico: 0,
      desviacionPorcentual: 0,
      superaDesvioSignificativo: false,
    });
  });

  it('debe responder correctamente cuando un parámetro del lote no está presente en el histórico acumulado', () => {
    const mockLoteActual = {
      id: 13,
      parametros: [{ parametro: 'ACIDEZ', valor: 0.15 }],
    } as unknown as Lote;

    const mockHistoricos = [
      {
        id: 1,
        parametros: [{ parametro: 'HUMEDAD', valor: 10 }], // Parámetro diferente
      },
    ] as unknown as Lote[];

    const resultado = ComparacionHistoricaMapper.build(
      mockLoteActual,
      mockHistoricos,
      mockConfig,
    );

    expect(resultado.parametros[0]).toEqual({
      parametro: 'ACIDEZ',
      valorLote: 0.15,
      promedioHistorico: 0,
      desviacionPorcentual: 0,
      superaDesvioSignificativo: false,
    });
  });
});