import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { HistorialMedicionManualFilterQueryDto } from '../dto/historial-medicion-manual-filter-query.dto';

describe('HistorialMedicionManualFilterQueryDto', () => {
  it('debe pasar la validación y asignar valores por defecto si el objeto está vacío', async () => {
    const plain = {};
    const dto = plainToInstance(HistorialMedicionManualFilterQueryDto, plain);

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('debe transformar y validar correctamente con todos los campos válidos', async () => {
    const plain = {
      fechaInicio: '2026-07-01T00:00:00Z',
      fechaFin: '2026-07-31T23:59:59Z',
      page: '2',
      limit: '10',
    };

    const dto = plainToInstance(HistorialMedicionManualFilterQueryDto, plain);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
    expect(dto.fechaInicio).toBe('2026-07-01T00:00:00Z');
    expect(dto.fechaFin).toBe('2026-07-31T23:59:59Z');
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(10);
  });

  it('debe fallar si las fechas no tienen un formato ISO 8601 válido', async () => {
    const plain = {
      fechaInicio: '01/07/2026',
      fechaFin: 'fecha-invalida',
    };

    const dto = plainToInstance(HistorialMedicionManualFilterQueryDto, plain);
    const errors = await validate(dto);

    expect(errors.length).toBe(2);

    const fechaInicioError = errors.find((e) => e.property === 'fechaInicio');
    const fechaFinError = errors.find((e) => e.property === 'fechaFin');

    expect(fechaInicioError?.constraints).toHaveProperty('isDateString');
    expect(fechaFinError?.constraints).toHaveProperty('isDateString');
  });

  it('debe fallar si page o limit son menores a 1', async () => {
    const plain = {
      page: 0,
      limit: -5,
    };

    const dto = plainToInstance(HistorialMedicionManualFilterQueryDto, plain);
    const errors = await validate(dto);

    expect(errors.length).toBe(2);

    const pageError = errors.find((e) => e.property === 'page');
    const limitError = errors.find((e) => e.property === 'limit');

    expect(pageError?.constraints).toHaveProperty('min');
    expect(limitError?.constraints).toHaveProperty('min');
  });

  it('debe fallar si page o limit no son números enteros', async () => {
    const plain = {
      page: 1.5,
      limit: 'abc',
    };

    const dto = plainToInstance(HistorialMedicionManualFilterQueryDto, plain);
    const errors = await validate(dto);

    expect(errors.length).toBe(2);

    const pageError = errors.find((e) => e.property === 'page');
    const limitError = errors.find((e) => e.property === 'limit');

    expect(pageError?.constraints).toHaveProperty('isInt');
    expect(limitError?.constraints).toHaveProperty('isInt');
  });
});
