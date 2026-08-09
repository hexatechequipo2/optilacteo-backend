import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { NotificacionFilterQueryDto } from '../dto/notificacion-filter-query.dto';

describe('NotificacionFilterQueryDto', () => {
  it('debe asignar valores por defecto válidos si no se pasan propiedades', async () => {
    const dto = plainToInstance(NotificacionFilterQueryDto, {});
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('debe transformar correctamente los strings numéricos enviados desde la URL', async () => {
    const plain = {
      page: '2',
      limit: '15',
    };

    const dto = plainToInstance(NotificacionFilterQueryDto, plain);
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(15);
    expect(typeof dto.page).toBe('number');
    expect(typeof dto.limit).toBe('number');
  });

  it('debe fallar si page o limit son menores a 1', async () => {
    const plain = {
      page: 0,
      limit: -5,
    };

    const dto = plainToInstance(NotificacionFilterQueryDto, plain);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);

    const pageError = errors.find((e) => e.property === 'page');
    const limitError = errors.find((e) => e.property === 'limit');

    expect(pageError?.constraints).toHaveProperty('min');
    expect(limitError?.constraints).toHaveProperty('min');
  });

  it('debe fallar si page o limit no son números enteros (p. ej., decimales)', async () => {
    const plain = {
      page: 1.5,
      limit: 10.2,
    };

    const dto = plainToInstance(NotificacionFilterQueryDto, plain);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);

    const pageError = errors.find(
      (e) => e.property === 'property' || e.property === 'page',
    );
    const limitError = errors.find((e) => e.property === 'limit');

    expect(pageError?.constraints).toHaveProperty('isInt');
    expect(limitError?.constraints).toHaveProperty('isInt');
  });

  it('debe fallar si se pasan cadenas no numéricas', async () => {
    const plain = {
      page: 'abc',
      limit: 'invalid',
    };

    const dto = plainToInstance(NotificacionFilterQueryDto, plain);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
