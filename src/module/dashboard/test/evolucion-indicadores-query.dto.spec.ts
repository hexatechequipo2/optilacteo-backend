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
});