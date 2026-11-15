import {
  esFechaCalendarioValida,
  fechaCalendarioComoUtc,
  inicioDelDiaEmpresa,
  rangoDiasInclusivoEmpresa,
  sumarDias,
} from '../utils/rango-fechas';

// Replica el filtro SQL `>= desde AND < hastaExclusivo`.
const incluye = (
  rango: { desde: Date; hastaExclusivo: Date },
  instanteIso: string,
) => {
  const t = new Date(instanteIso).getTime();
  return t >= rango.desde.getTime() && t < rango.hastaExclusivo.getTime();
};

describe('rango-fechas (HU-75)', () => {
  describe('esFechaCalendarioValida', () => {
    it.each(['2026-03-10', '2024-02-29', '2026-12-31'])(
      'acepta %s',
      (valor) => {
        expect(esFechaCalendarioValida(valor)).toBe(true);
      },
    );

    it.each([
      '2026-02-30',
      '2026-02-29', // 2026 no es bisiesto
      '2026-13-01',
      '2026-3-10',
      '10/03/2026',
      '2026-03-10T00:00:00Z',
      '',
      undefined,
      20260310,
    ])('rechaza %p', (valor) => {
      expect(esFechaCalendarioValida(valor)).toBe(false);
    });
  });

  describe('inicioDelDiaEmpresa', () => {
    it('devuelve las 00:00 hora AR (03:00 UTC) del día indicado', () => {
      expect(inicioDelDiaEmpresa('2026-03-10').toISOString()).toBe(
        '2026-03-10T03:00:00.000Z',
      );
    });

    it('lanza error con una fecha inválida', () => {
      expect(() => inicioDelDiaEmpresa('2026-02-30')).toThrow(
        'Fecha calendario inválida',
      );
    });
  });

  describe('sumarDias', () => {
    it.each([
      ['2026-03-15', 1, '2026-03-16'],
      ['2026-02-28', 1, '2026-03-01'],
      ['2024-02-28', 1, '2024-02-29'],
      ['2026-12-31', 1, '2027-01-01'],
      ['2026-03-01', -1, '2026-02-28'],
    ])('%s + %i = %s', (fecha, dias, esperado) => {
      expect(sumarDias(fecha, dias)).toBe(esperado);
    });
  });

  describe('fechaCalendarioComoUtc', () => {
    it('representa el día como medianoche UTC', () => {
      expect(fechaCalendarioComoUtc('2026-03-10').toISOString()).toBe(
        '2026-03-10T00:00:00.000Z',
      );
    });
  });

  describe('rangoDiasInclusivoEmpresa', () => {
    const rango = rangoDiasInclusivoEmpresa('2026-03-10', '2026-03-15');

    it('arma [desde 00:00 AR, (hasta + 1) 00:00 AR) en UTC', () => {
      expect(rango.desde.toISOString()).toBe('2026-03-10T03:00:00.000Z');
      expect(rango.hastaExclusivo.toISOString()).toBe(
        '2026-03-16T03:00:00.000Z',
      );
    });

    it('incluye el día 10 y el 15, y excluye el 9 y el 16', () => {
      expect(incluye(rango, '2026-03-10T12:00:00-03:00')).toBe(true);
      expect(incluye(rango, '2026-03-15T12:00:00-03:00')).toBe(true);
      expect(incluye(rango, '2026-03-09T12:00:00-03:00')).toBe(false);
      expect(incluye(rango, '2026-03-16T12:00:00-03:00')).toBe(false);
    });

    it('respeta los bordes exactos en hora AR', () => {
      expect(incluye(rango, '2026-03-09T23:59:59.999-03:00')).toBe(false);
      expect(incluye(rango, '2026-03-10T00:00:00.000-03:00')).toBe(true);
      expect(incluye(rango, '2026-03-15T23:59:59.999-03:00')).toBe(true);
      expect(incluye(rango, '2026-03-16T00:00:00.000-03:00')).toBe(false);
    });

    it('incluye un registro a las 23:30 AR del día 15 (02:30 UTC del 16)', () => {
      expect(incluye(rango, '2026-03-16T02:30:00Z')).toBe(true);
    });

    it('incluye un registro a las 00:30 AR del día 10 (03:30 UTC)', () => {
      expect(incluye(rango, '2026-03-10T03:30:00Z')).toBe(true);
    });

    it('excluye un registro a las 21:00 AR del día 9 (00:00 UTC del 10)', () => {
      // Caso que el código anterior incluía al tomar 'YYYY-MM-DD' como UTC.
      expect(incluye(rango, '2026-03-10T00:00:00Z')).toBe(false);
    });

    it('cruza un cambio de mes', () => {
      const r = rangoDiasInclusivoEmpresa('2026-02-27', '2026-03-02');

      expect(r.desde.toISOString()).toBe('2026-02-27T03:00:00.000Z');
      expect(r.hastaExclusivo.toISOString()).toBe('2026-03-03T03:00:00.000Z');
      expect(incluye(r, '2026-02-28T23:30:00-03:00')).toBe(true);
      expect(incluye(r, '2026-03-01T00:30:00-03:00')).toBe(true);
      expect(incluye(r, '2026-02-26T23:59:59-03:00')).toBe(false);
      expect(incluye(r, '2026-03-03T00:00:00-03:00')).toBe(false);
    });

    it('cruza un cambio de año', () => {
      const r = rangoDiasInclusivoEmpresa('2026-12-30', '2026-12-31');

      expect(r.hastaExclusivo.toISOString()).toBe('2027-01-01T03:00:00.000Z');
      expect(incluye(r, '2026-12-31T23:30:00-03:00')).toBe(true);
    });

    it('un rango de un solo día abarca exactamente 24 horas', () => {
      const r = rangoDiasInclusivoEmpresa('2026-03-10', '2026-03-10');

      expect(r.hastaExclusivo.getTime() - r.desde.getTime()).toBe(86_400_000);
    });
  });
});
