import { MetricasCalidadResponseDto } from '../dto/metricas-calidad-response.dto';
import { MetricaParametroResponseDto } from '../dto/metrica-parametro-response.dto';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

describe('MetricasCalidadResponseDto', () => {
  it('debe instanciarse correctamente indicando que no hay lote en proceso (enProceso: false)', () => {
    const dto = new MetricasCalidadResponseDto();
    dto.enProceso = false;

    expect(dto).toBeDefined();
    expect(dto.enProceso).toBe(false);
    expect(dto.loteId).toBeUndefined();
    expect(dto.parametros).toBeUndefined();
  });

  it('debe instanciarse correctamente cuando hay un lote en proceso (enProceso: true) con loteId y métricas', () => {
    const mockMetrica = new MetricaParametroResponseDto();
    mockMetrica.parametro = Parametro.TEMPERATURA;
    mockMetrica.valor = 4.2;
    mockMetrica.unidad = '°C';
    mockMetrica.umbralMin = 2.0;
    mockMetrica.umbralMax = 8.0;
    mockMetrica.fueraDeRango = false;
    mockMetrica.timestampLectura = new Date('2026-07-31T10:00:00Z');

    const dto = new MetricasCalidadResponseDto();
    dto.enProceso = true;
    dto.loteId = 100;
    dto.parametros = [mockMetrica];

    expect(dto).toBeDefined();
    expect(dto.enProceso).toBe(true);
    expect(dto.loteId).toBe(100);
    expect(dto.parametros).toHaveLength(1);
    expect(dto.parametros?.[0]).toBe(mockMetrica);
  });
});
