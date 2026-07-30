import {
  DashboardHistoricoDto,
  PuntoHistoricoDto,
} from '../dto/dashboard-historico.dto';

describe('DashboardHistoricoDto', () => {
  it('debe permitir crear un histórico con sus puntos', () => {
    const punto = new PuntoHistoricoDto();
    punto.fecha = '2026-07-30';
    punto.lotesProcesados = 15;

    const dto = new DashboardHistoricoDto();
    dto.dias = 7;
    dto.puntos = [punto];

    expect(dto.dias).toBe(7);
    expect(dto.puntos).toHaveLength(1);
    expect(dto.puntos[0]).toEqual(punto);
  });
});

describe('PuntoHistoricoDto', () => {
  it('debe almacenar la fecha y la cantidad de lotes procesados', () => {
    const dto = new PuntoHistoricoDto();
    dto.fecha = '2026-07-30';
    dto.lotesProcesados = 10;

    expect(dto.fecha).toBe('2026-07-30');
    expect(dto.lotesProcesados).toBe(10);
  });
});