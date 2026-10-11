import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateMedicionManualLoteDto } from '../dto/create-medicion-manual-lote.dto';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { MedicionManualParametroItemDto } from '../dto/medicion-manual-parametro-item.dto';

describe('CreateMedicionManualLoteDto', () => {
  const crearDto = (data: Record<string, unknown>) =>
    plainToInstance(CreateMedicionManualLoteDto, data);

  const parametroValido = {
    parametro: 'temperatura',
    valor: 5,
  };

  it('debería aceptar un DTO válido', async () => {
    const dto = crearDto({
      tipoMateriaPrima: Object.values(TipoMateriaPrima)[0],
      parametros: [parametroValido],
    });

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('debería rechazar un tipoMateriaPrima inválido', async () => {
    const dto = crearDto({
      tipoMateriaPrima: 'TIPO_INVALIDO',
      parametros: [parametroValido],
    });

    const errores = await validate(dto);

    expect(errores.some((error) => error.property === 'tipoMateriaPrima')).toBe(
      true,
    );
  });

  it('debería rechazar parametros cuando no es un array', async () => {
    const dto = crearDto({
      tipoMateriaPrima: Object.values(TipoMateriaPrima)[0],
      parametros: parametroValido,
    });

    const errores = await validate(dto);

    expect(errores.some((error) => error.property === 'parametros')).toBe(
      true,
    );
  });

  it('debería rechazar un array de parametros vacío', async () => {
    const dto = crearDto({
      tipoMateriaPrima: Object.values(TipoMateriaPrima)[0],
      parametros: [],
    });

    const errores = await validate(dto);

    expect(errores.some((error) => error.property === 'parametros')).toBe(
      true,
    );
  });

  it('debería validar cada elemento anidado de parametros', async () => {
    const dto = crearDto({
      tipoMateriaPrima: Object.values(TipoMateriaPrima)[0],
      parametros: [{}],
    });

    const errores = await validate(dto);

    const errorParametros = errores.find(
      (error) => error.property === 'parametros',
    );

    expect(errorParametros).toBeDefined();
    expect(errorParametros?.children).toBeDefined();
    expect(errorParametros?.children?.length).toBeGreaterThan(0);
  });

  it('debería transformar los elementos de parametros a DTOs', () => {
    const dto = crearDto({
      tipoMateriaPrima: Object.values(TipoMateriaPrima)[0],
      parametros: [parametroValido],
    });

    expect(dto.parametros[0]).toBeInstanceOf(
      MedicionManualParametroItemDto,
    );
  });

  it('debería rechazar un tipoMateriaPrima faltante', async () => {
    const dto = crearDto({
      parametros: [parametroValido],
    });

    const errores = await validate(dto);

    expect(errores.some((error) => error.property === 'tipoMateriaPrima')).toBe(
      true,
    );
  });

  it('debería rechazar parametros faltante', async () => {
    const dto = crearDto({
      tipoMateriaPrima: Object.values(TipoMateriaPrima)[0],
    });

    const errores = await validate(dto);

    expect(errores.some((error) => error.property === 'parametros')).toBe(
      true,
    );
  });
});