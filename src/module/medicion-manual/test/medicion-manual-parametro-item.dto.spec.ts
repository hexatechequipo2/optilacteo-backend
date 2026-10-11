import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { MedicionManualParametroItemDto } from '../dto/medicion-manual-parametro-item.dto';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

describe('MedicionManualParametroItemDto', () => {
  const crearDto = (data: Record<string, unknown>) =>
    plainToInstance(MedicionManualParametroItemDto, data);

  it('debería aceptar un DTO válido', async () => {
    const dto = crearDto({
      parametro: Object.values(Parametro).find(
        (value) => typeof value === 'string',
      ),
      valor: 6.7,
    });

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('debería rechazar un parametro inválido', async () => {
    const dto = crearDto({
      parametro: 'PARAMETRO_INVALIDO',
      valor: 6.7,
    });

    const errores = await validate(dto);

    const errorParametro = errores.find(
      (error) => error.property === 'parametro',
    );

    expect(errorParametro).toBeDefined();
    expect(errorParametro?.constraints).toHaveProperty('isEnum');
    expect(errorParametro?.constraints?.isEnum).toBe('parametro inválido');
  });

  it('debería rechazar un valor no numérico', async () => {
    const dto = crearDto({
      parametro: Object.values(Parametro).find(
        (value) => typeof value === 'string',
      ),
      valor: 'seis',
    });

    const errores = await validate(dto);

    const errorValor = errores.find((error) => error.property === 'valor');

    expect(errorValor).toBeDefined();
    expect(errorValor?.constraints).toHaveProperty('isNumber');
    expect(errorValor?.constraints?.isNumber).toBe(
      'el valor debe ser numérico',
    );
  });

  it('debería rechazar un parametro faltante', async () => {
    const dto = crearDto({ valor: 6.7 });

    const errores = await validate(dto);

    expect(errores.some((error) => error.property === 'parametro')).toBe(true);
  });

  it('debería rechazar un valor faltante', async () => {
    const dto = crearDto({
      parametro: Object.values(Parametro).find(
        (value) => typeof value === 'string',
      ),
    });

    const errores = await validate(dto);

    expect(errores.some((error) => error.property === 'valor')).toBe(true);
  });

  it('debería aceptar un valor decimal', async () => {
    const dto = crearDto({
      parametro: Object.values(Parametro).find(
        (value) => typeof value === 'string',
      ),
      valor: 6.75,
    });

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('debería rechazar NaN como valor', async () => {
    const dto = crearDto({
      parametro: Object.values(Parametro).find(
        (value) => typeof value === 'string',
      ),
      valor: NaN,
    });

    const errores = await validate(dto);

    expect(errores.some((error) => error.property === 'valor')).toBe(true);
  });
});