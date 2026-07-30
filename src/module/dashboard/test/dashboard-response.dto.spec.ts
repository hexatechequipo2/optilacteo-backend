import {
  DashboardResponseDto,
  LineaCalidadDto,
  MetricaDto,
} from '../dto/dashboard-response.dto';

describe('MetricaDto', () => {
  it('debe almacenar los datos de una métrica', () => {
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
  it('debe almacenar toda la información del dashboard', () => {
    const metrica = new MetricaDto();
    metrica.valor = 10;
    metrica.valorAnterior = 8;
    metrica.tendencia = 'sube';
    metrica.variacion = 2;

    const lineaCalidad = new LineaCalidadDto();
    lineaCalidad.recepcion = 15;
    lineaCalidad.clasificacion = 14;
    lineaCalidad.aptos = 13;
    lineaCalidad.noAptos = 1;
    lineaCalidad.totalLotesSistema = 100;

    const fecha = new Date();

    const dto = new DashboardResponseDto();
    dto.lotesProcesados = metrica;
    dto.alertasActivas = metrica;
    dto.parametrosCriticos = metrica;
    dto.lineaCalidad = lineaCalidad;
    dto.actualizadoEn = fecha;

    expect(dto.lotesProcesados).toBe(metrica);
    expect(dto.alertasActivas).toBe(metrica);
    expect(dto.parametrosCriticos).toBe(metrica);
    expect(dto.lineaCalidad).toBe(lineaCalidad);
    expect(dto.actualizadoEn).toBe(fecha);
  });
});