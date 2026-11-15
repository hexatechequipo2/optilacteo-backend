import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  EvolucionIndicadoresQueryDto,
  PeriodoEvolucion,
} from '../dto/evolucion-indicadores-query.dto';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

const transformar = (plain: Record<string, unknown>) =>
  plainToInstance(EvolucionIndicadoresQueryDto, plain);

const campos = async (plain: Record<string, unknown>) =>
  (await validate(transformar(plain))).map((e) => e.property);

describe('EvolucionIndicadoresQueryDto', () => {
  describe('transformación de indicadores', () => {
    it('separa por coma un string con varios indicadores', () => {
      const dto = transformar({
        indicadores: `${Parametro.GRASA},${Parametro.PROTEINA}`,
      });

      expect(dto.indicadores).toEqual([Parametro.GRASA, Parametro.PROTEINA]);
    });

    it('convierte un único string en un array de un elemento', () => {
      const dto = transformar({ indicadores: Parametro.PH });

      expect(dto.indicadores).toEqual([Parametro.PH]);
    });

    it('deja intacto un array que ya viene como array', () => {
      const dto = transformar({
        indicadores: [Parametro.GRASA, Parametro.ACIDEZ],
      });

      expect(dto.indicadores).toEqual([Parametro.GRASA, Parametro.ACIDEZ]);
    });
  });

  describe('valores por defecto', () => {
    it('usa periodo MES si no se envía', () => {
      const dto = transformar({ indicadores: Parametro.PH });

      expect(dto.periodo).toBe(PeriodoEvolucion.MES);
    });
  });

  describe('validaciones', () => {
    it('acepta una query mínima válida', async () => {
      expect(await campos({ indicadores: Parametro.PH })).toEqual([]);
    });

    it('acepta periodo rango con desde y hasta', async () => {
      expect(
        await campos({
          periodo: 'rango',
          indicadores: `${Parametro.GRASA},${Parametro.PH}`,
          desde: '2026-08-01',
          hasta: '2026-08-31',
        }),
      ).toEqual([]);
    });

    it('rechaza un periodo fuera del enum', async () => {
      expect(
        await campos({ periodo: 'anio', indicadores: Parametro.PH }),
      ).toContain('periodo');
    });

    it('rechaza un indicador que no pertenece al enum Parametro', async () => {
      expect(await campos({ indicadores: 'inventado' })).toContain(
        'indicadores',
      );
    });

    it('rechaza si un solo indicador de la lista es inválido', async () => {
      expect(
        await campos({ indicadores: `${Parametro.PH},inventado` }),
      ).toContain('indicadores');
    });

    it('rechaza si falta indicadores', async () => {
      // String(undefined).split(',') da ['undefined'], que no es del enum.
      expect(await campos({})).toContain('indicadores');
    });

    it.each([
      ['desde', { desde: 'no-es-fecha' }],
      ['hasta', { hasta: '31/08/2026' }],
    ])('rechaza %s con formato de fecha inválido', async (campo, extra) => {
      expect(
        await campos({ indicadores: Parametro.PH, ...extra }),
      ).toContain(campo);
    });
  });

  // HU-75: rango personalizado con días calendario YYYY-MM-DD.
  describe('rango de fechas', () => {
    const rango = (desde?: string, hasta?: string) => ({
      periodo: 'rango',
      indicadores: Parametro.PH,
      desde,
      hasta,
    });

    const mensajes = async (plain: Record<string, unknown>) =>
      (await validate(transformar(plain))).flatMap((e) =>
        Object.values(e.constraints ?? {}),
      );

    it('acepta desde igual a hasta', async () => {
      expect(await campos(rango('2026-03-10', '2026-03-10'))).toEqual([]);
    });

    it('acepta un rango que cruza un cambio de mes', async () => {
      expect(await campos(rango('2026-02-27', '2026-03-02'))).toEqual([]);
    });

    it('rechaza desde posterior a hasta con un mensaje claro', async () => {
      expect(await mensajes(rango('2026-03-15', '2026-03-10'))).toEqual([
        'La fecha "desde" no puede ser posterior a la fecha "hasta"',
      ]);
    });

    it.each([
      ['2026-02-30', 'desde'],
      ['2026-03-10T00:00:00Z', 'desde'],
    ])('rechaza desde=%s', async (desde, campo) => {
      expect(await campos(rango(desde, '2026-03-31'))).toEqual([campo]);
    });

    it('exige desde y hasta cuando periodo=rango', async () => {
      expect(await mensajes(rango())).toEqual([
        'desde es requerido cuando periodo=rango',
        'hasta es requerido cuando periodo=rango',
      ]);
    });

    it('no exige fechas si el periodo no es rango', async () => {
      expect(
        await campos({ periodo: 'dia', indicadores: Parametro.PH }),
      ).toEqual([]);
    });
  });
});