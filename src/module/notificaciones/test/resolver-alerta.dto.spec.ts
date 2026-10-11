import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ResolverAlertaDto } from '../dto/resolver-alerta.dto';

describe('ResolverAlertaDto', () => {
  const crearDto = (data: Record<string, unknown>) =>
    plainToInstance(ResolverAlertaDto, data);

  it('debería aceptar una acción correctiva válida', async () => {
    const dto = crearDto({
      accionCorrectiva: 'Se recalibró el sensor de temperatura.',
    });

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('debería aceptar una acción correctiva de exactamente 5 caracteres', async () => {
    const dto = crearDto({
      accionCorrectiva: 'ABCDE',
    });

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('debería rechazar una acción correctiva con menos de 5 caracteres', async () => {
    const dto = crearDto({
      accionCorrectiva: 'Test',
    });

    const errores = await validate(dto);

    const error = errores.find(
      (item) => item.property === 'accionCorrectiva',
    );

    expect(error).toBeDefined();
    expect(error?.constraints).toHaveProperty('minLength');
    expect(error?.constraints?.minLength).toBe(
      'La acción correctiva debe tener al menos 5 caracteres',
    );
  });

  it('debería rechazar una acción correctiva vacía', async () => {
    const dto = crearDto({
      accionCorrectiva: '',
    });

    const errores = await validate(dto);

    const error = errores.find(
      (item) => item.property === 'accionCorrectiva',
    );

    expect(error).toBeDefined();
    expect(error?.constraints).toHaveProperty('isNotEmpty');
    expect(error?.constraints?.isNotEmpty).toBe(
      'La acción correctiva es obligatoria',
    );
  });

  it('debería rechazar una acción correctiva que no sea string', async () => {
    const dto = crearDto({
      accionCorrectiva: 12345,
    });

    const errores = await validate(dto);

    const error = errores.find(
      (item) => item.property === 'accionCorrectiva',
    );

    expect(error).toBeDefined();
    expect(error?.constraints).toHaveProperty('isString');
  });

  it('debería rechazar una acción correctiva nula', async () => {
    const dto = crearDto({
      accionCorrectiva: null,
    });

    const errores = await validate(dto);

    expect(
      errores.some((error) => error.property === 'accionCorrectiva'),
    ).toBe(true);
  });

  it('debería rechazar una acción correctiva ausente', async () => {
    const dto = crearDto({});

    const errores = await validate(dto);

    expect(
      errores.some((error) => error.property === 'accionCorrectiva'),
    ).toBe(true);
  });

  it('debería rechazar un array como acción correctiva', async () => {
    const dto = crearDto({
      accionCorrectiva: ['acción', 'correctiva'],
    });

    const errores = await validate(dto);

    const error = errores.find(
      (item) => item.property === 'accionCorrectiva',
    );

    expect(error).toBeDefined();
    expect(error?.constraints).toHaveProperty('isString');
  });
});