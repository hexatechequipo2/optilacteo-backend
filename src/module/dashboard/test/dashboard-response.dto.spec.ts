import {
  DashboardResponseDto,
  LineaCalidadDto,
  MetricaDto,
} from '../dto/dashboard-response.dto';
import { GranularidadHistorico } from '../dto/dashboard-historico.dto';

describe('MetricaDto', () => {
  it('debe almacenar los datos de una métrica que sube', () => {
    const dto = new MetricaDto();
    dto.valor = 20;
    dto.valorAnterior = 15;
    dto.tendencia = 'sube';
    dto.variacion = 5;

    expect(dto.valor).toBe(20);
    expect(dto.valorAnterior).toBe(15);
    expect(dto.tendencia).toBe('sube');
    expect(dto.variacion).toBe(5);
  });

  it('debe almacenar los datos de una métrica que baja', () => {
    const dto = new MetricaDto();
    dto.valor = 10;
    dto.valorAnterior = 15;
    dto.tendencia = 'baja';
    dto.variacion = -5;

    expect(dto.tendencia).toBe('baja');
    expect(dto.variacion).toBe(-5);
  });

  it('debe almacenar los datos de una métrica que se mantiene igual', () => {
    const dto = new MetricaDto();
    dto.valor = 10;
    dto.valorAnterior = 10;
    dto.tendencia = 'igual';
    dto.variacion = 0;

    expect(dto.tendencia).toBe('igual');
    expect(dto.variacion).toBe(0);
  });
});

describe('LineaCalidadDto', () => {
  it('debe almacenar los valores de la línea de calidad', () => {
    const dto = new LineaCalidadDto();
    dto.recepcion = 25;
    dto.clasificacion = 20;
    dto.aptos = 18;
    dto.noAptos = 2;
    dto.totalLotesSistema = 120;

    expect(dto.recepcion).toBe(25);
    expect(dto.clasificacion).toBe(20);
    expect(dto.aptos).toBe(18);
    expect(dto.noAptos).toBe(2);
    expect(dto.totalLotesSistema).toBe(120);
  });
});

describe('DashboardResponseDto', () => {
  const buildMetrica = (): MetricaDto => {
    const metrica = new MetricaDto();
    metrica.valor = 10;
    metrica.valorAnterior = 8;
    metrica.tendencia = 'sube';
    metrica.variacion = 2;
    return metrica;
  };

  const buildLineaCalidad = (): LineaCalidadDto => {
    const lineaCalidad = new LineaCalidadDto();
    lineaCalidad.recepcion = 15;
    lineaCalidad.clasificacion = 14;
    lineaCalidad.aptos = 13;
    lineaCalidad.noAptos = 1;
    lineaCalidad.totalLotesSistema = 100;
    return lineaCalidad;
  };

  it('debe almacenar toda la información del dashboard con granularidad "dia"', () => {
    const metrica = buildMetrica();
    const lineaCalidad = buildLineaCalidad();
    const fecha = new Date();

    const dto = new DashboardResponseDto();
    dto.granularidad = GranularidadHistorico.DIA;
    dto.lotesProcesados = metrica;
    dto.alertasActivas = metrica;
    dto.parametrosCriticos = metrica;
    dto.lineaCalidad = lineaCalidad;
    dto.actualizadoEn = fecha;

    expect(dto.granularidad).toBe(GranularidadHistorico.DIA);
    expect(dto.lotesProcesados).toBe(metrica);
    expect(dto.alertasActivas).toBe(metrica);
    expect(dto.parametrosCriticos).toBe(metrica);
    expect(dto.lineaCalidad).toBe(lineaCalidad);
    expect(dto.actualizadoEn).toBe(fecha);
  });

  it('debe permitir granularidad "semana"', () => {
    const dto = new DashboardResponseDto();
    dto.granularidad = GranularidadHistorico.SEMANA;
    dto.lotesProcesados = buildMetrica();
    dto.alertasActivas = buildMetrica();
    dto.parametrosCriticos = buildMetrica();
    dto.lineaCalidad = buildLineaCalidad();
    dto.actualizadoEn = new Date();

    expect(dto.granularidad).toBe(GranularidadHistorico.SEMANA);
  });

  it('debe permitir granularidad "mes"', () => {
    const dto = new DashboardResponseDto();
    dto.granularidad = GranularidadHistorico.MES;
    dto.lotesProcesados = buildMetrica();
    dto.alertasActivas = buildMetrica();
    dto.parametrosCriticos = buildMetrica();
    dto.lineaCalidad = buildLineaCalidad();
    dto.actualizadoEn = new Date();

    expect(dto.granularidad).toBe(GranularidadHistorico.MES);
  });

  it('debe permitir métricas independientes por indicador (no solo una compartida)', () => {
    const lotesProcesados = buildMetrica();

    const alertasActivas = new MetricaDto();
    alertasActivas.valor = 3;
    alertasActivas.valorAnterior = 5;
    alertasActivas.tendencia = 'baja';
    alertasActivas.variacion = -2;

    const parametrosCriticos = new MetricaDto();
    parametrosCriticos.valor = 0;
    parametrosCriticos.valorAnterior = 0;
    parametrosCriticos.tendencia = 'igual';
    parametrosCriticos.variacion = 0;

    const dto = new DashboardResponseDto();
    dto.granularidad = GranularidadHistorico.DIA;
    dto.lotesProcesados = lotesProcesados;
    dto.alertasActivas = alertasActivas;
    dto.parametrosCriticos = parametrosCriticos;
    dto.lineaCalidad = buildLineaCalidad();
    dto.actualizadoEn = new Date();

    expect(dto.lotesProcesados.tendencia).toBe('sube');
    expect(dto.alertasActivas.tendencia).toBe('baja');
    expect(dto.parametrosCriticos.tendencia).toBe('igual');
  });
});