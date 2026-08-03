import {
  DashboardHistoricoDto,
  PuntoHistoricoDto,
  GranularidadHistorico,
} from '../dto/dashboard-historico.dto';

describe('PuntoHistoricoDto', () => {
  it('debe almacenar la fecha y la cantidad de lotes procesados', () => {
    const dto = new PuntoHistoricoDto();
    dto.fecha = '2026-07-30';
    dto.lotesProcesados = 10;

    expect(dto.fecha).toBe('2026-07-30');
    expect(dto.lotesProcesados).toBe(10);
  });

  it('debe permitir lotesProcesados en 0 (período sin lotes)', () => {
    const dto = new PuntoHistoricoDto();
    dto.fecha = '2026-07-31';
    dto.lotesProcesados = 0;

    expect(dto.lotesProcesados).toBe(0);
  });
});

describe('DashboardHistoricoDto', () => {
  it('debe permitir crear un histórico con granularidad "dia" y sus puntos', () => {
    const punto = new PuntoHistoricoDto();
    punto.fecha = '2026-07-30';
    punto.lotesProcesados = 15;

    const dto = new DashboardHistoricoDto();
    dto.granularidad = GranularidadHistorico.DIA;
    dto.cantidad = 7;
    dto.puntos = [punto];

    expect(dto.granularidad).toBe(GranularidadHistorico.DIA);
    expect(dto.cantidad).toBe(7);
    expect(dto.puntos).toHaveLength(1);
    expect(dto.puntos[0]).toEqual(punto);
  });

  it('debe permitir granularidad "semana" con fechas en formato YYYY-MM-DD', () => {
    const punto = new PuntoHistoricoDto();
    punto.fecha = '2026-07-27'; // lunes de esa semana
    punto.lotesProcesados = 42;

    const dto = new DashboardHistoricoDto();
    dto.granularidad = GranularidadHistorico.SEMANA;
    dto.cantidad = 12;
    dto.puntos = [punto];

    expect(dto.granularidad).toBe(GranularidadHistorico.SEMANA);
    expect(dto.puntos[0].fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('debe permitir granularidad "mes" con fechas en formato YYYY-MM', () => {
    const punto = new PuntoHistoricoDto();
    punto.fecha = '2026-07';
    punto.lotesProcesados = 120;

    const dto = new DashboardHistoricoDto();
    dto.granularidad = GranularidadHistorico.MES;
    dto.cantidad = 6;
    dto.puntos = [punto];

    expect(dto.granularidad).toBe(GranularidadHistorico.MES);
    expect(dto.puntos[0].fecha).toMatch(/^\d{4}-\d{2}$/);
  });

  it('debe permitir un arreglo de puntos vacío (cantidad=0 o sin datos en el rango)', () => {
    const dto = new DashboardHistoricoDto();
    dto.granularidad = GranularidadHistorico.DIA;
    dto.cantidad = 0;
    dto.puntos = [];

    expect(dto.puntos).toHaveLength(0);
  });

  it('debe conservar el orden cronológico de los puntos', () => {
    const puntoViejo = new PuntoHistoricoDto();
    puntoViejo.fecha = '2026-07-28';
    puntoViejo.lotesProcesados = 5;

    const puntoNuevo = new PuntoHistoricoDto();
    puntoNuevo.fecha = '2026-07-30';
    puntoNuevo.lotesProcesados = 8;

    const dto = new DashboardHistoricoDto();
    dto.granularidad = GranularidadHistorico.DIA;
    dto.cantidad = 2;
    dto.puntos = [puntoViejo, puntoNuevo];

    expect(dto.puntos[0].fecha).toBe('2026-07-28');
    expect(dto.puntos[1].fecha).toBe('2026-07-30');
  });
});