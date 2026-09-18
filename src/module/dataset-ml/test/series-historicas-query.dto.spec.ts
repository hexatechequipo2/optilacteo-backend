import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SeriesHistoricasQueryDto } from '../dto/series-historicas-query.dto';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

describe('SeriesHistoricasQueryDto — validación de query params (HU-50)', () => {
  it('cuando los datos ingresados son válidos, debe pasar la validación y transformar empresaId a number', async () => {
    const plainObject = {
      empresaId: '1',
      parametro: Parametro.PH,
      desde: '2026-07-01T00:00:00.000Z',
      hasta: '2026-09-01T23:59:59.000Z',
    };

    const dto = plainToInstance(SeriesHistoricasQueryDto, plainObject);
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBe(0);
    expect(dto).toBeInstanceOf(SeriesHistoricasQueryDto);
    expect(typeof dto.empresaId).toBe('number');
    expect(dto.empresaId).toBe(1);
  });

  it('cuando empresaId es menor a 1 o no es entero, debe retornar errores de validación', async () => {
    const plainObject = {
      empresaId: 0,
      parametro: Parametro.PH,
      desde: '2026-07-01',
      hasta: '2026-09-01',
    };

    const dto = plainToInstance(SeriesHistoricasQueryDto, plainObject);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('empresaId');
    expect(errors[0].constraints).toHaveProperty('min');
  });

  it('cuando parametro no pertenece al enum Parametro, debe retornar un error de validación', async () => {
    const plainObject = {
      empresaId: 1,
      parametro: 'PARAMETRO_INVALIDO',
      desde: '2026-07-01',
      hasta: '2026-09-01',
    };

    const dto = plainToInstance(SeriesHistoricasQueryDto, plainObject);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('parametro');
    expect(errors[0].constraints).toHaveProperty('isEnum');
  });

  it('cuando las fechas no cumplen con el formato ISO8601, debe retornar errores de validación', async () => {
    const plainObject = {
      empresaId: 1,
      parametro: Parametro.PH,
      desde: '01/07/2026',
      hasta: 'invalid-date',
    };

    const dto = plainToInstance(SeriesHistoricasQueryDto, plainObject);
    const errors = await validate(dto);

    expect(errors.length).toBe(2);
    const propertiesWithErrors = errors.map((e) => e.property);
    expect(propertiesWithErrors).toContain('desde');
    expect(propertiesWithErrors).toContain('hasta');
  });
});