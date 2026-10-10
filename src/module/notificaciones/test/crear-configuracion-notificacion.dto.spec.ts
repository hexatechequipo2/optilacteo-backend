import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CrearConfiguracionNotificacionDto } from '../dto/crear-configuracion-notificacion.dto';
import { NivelAlerta } from '../enums/nivel-alerta.enum';

describe('CrearConfiguracionNotificacionDto', () => {
  const nivelAlertaValido = Object.values(NivelAlerta).find(
    (value) => typeof value === 'string',
  ) as NivelAlerta;

  const crearDto = (data: Record<string, unknown>) =>
    plainToInstance(CrearConfiguracionNotificacionDto, data);

  it('debería aceptar un DTO válido con rolId', async () => {
    const dto = crearDto({
      nivelAlerta: nivelAlertaValido,
      rolId: 1,
    });

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('debería aceptar un DTO válido con usuarioId', async () => {
    const dto = crearDto({
      nivelAlerta: nivelAlertaValido,
      usuarioId: 2,
    });

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('debería aceptar ambos campos opcionales omitidos', async () => {
    const dto = crearDto({
      nivelAlerta: nivelAlertaValido,
    });

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('debería rechazar un nivelAlerta inválido', async () => {
    const dto = crearDto({
      nivelAlerta: 'NIVEL_INVALIDO',
      rolId: 1,
    });

    const errores = await validate(dto);

    const error = errores.find(
      (item) => item.property === 'nivelAlerta',
    );

    expect(error).toBeDefined();
    expect(error?.constraints).toHaveProperty('isEnum');
  });

  it('debería rechazar nivelAlerta faltante', async () => {
    const dto = crearDto({
      rolId: 1,
    });

    const errores = await validate(dto);

    expect(
      errores.some((error) => error.property === 'nivelAlerta'),
    ).toBe(true);
  });

  it('debería rechazar rolId cuando no es un entero', async () => {
    const dto = crearDto({
      nivelAlerta: nivelAlertaValido,
      rolId: 1.5,
    });

    const errores = await validate(dto);

    expect(errores.some((error) => error.property === 'rolId')).toBe(true);
  });

  it('debería rechazar rolId cuando no es positivo', async () => {
    const dto = crearDto({
      nivelAlerta: nivelAlertaValido,
      rolId: 0,
    });

    const errores = await validate(dto);

    expect(errores.some((error) => error.property === 'rolId')).toBe(true);
  });

  it('debería rechazar rolId negativo', async () => {
    const dto = crearDto({
      nivelAlerta: nivelAlertaValido,
      rolId: -1,
    });

    const errores = await validate(dto);

    expect(errores.some((error) => error.property === 'rolId')).toBe(true);
  });

  it('debería rechazar usuarioId cuando no es un entero', async () => {
    const dto = crearDto({
      nivelAlerta: nivelAlertaValido,
      usuarioId: 2.5,
    });

    const errores = await validate(dto);

    expect(errores.some((error) => error.property === 'usuarioId')).toBe(true);
  });

  it('debería rechazar usuarioId cuando no es positivo', async () => {
    const dto = crearDto({
      nivelAlerta: nivelAlertaValido,
      usuarioId: 0,
    });

    const errores = await validate(dto);

    expect(errores.some((error) => error.property === 'usuarioId')).toBe(true);
  });

  it('debería rechazar usuarioId negativo', async () => {
    const dto = crearDto({
      nivelAlerta: nivelAlertaValido,
      usuarioId: -2,
    });

    const errores = await validate(dto);

    expect(errores.some((error) => error.property === 'usuarioId')).toBe(true);
  });

  it('debería aceptar ambos campos opcionales ausentes o undefined', async () => {
    const dto = crearDto({
      nivelAlerta: nivelAlertaValido,
      rolId: undefined,
      usuarioId: undefined,
    });

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });
});