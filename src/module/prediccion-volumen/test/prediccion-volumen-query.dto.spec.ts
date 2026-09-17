import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PrediccionVolumenQueryDto } from '../dto/prediccion-volumen-query.dto';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';

describe('PrediccionVolumenQueryDto', () => {
  const transformAndValidate = async (plainObject: Record<string, any>) => {
    const dto = plainToInstance(PrediccionVolumenQueryDto, plainObject);
    const errors = await validate(dto);
    return { dto, errors };
  };

  it('debe validar exitosamente cuando se pasan valores válidos y asignar el valor por defecto', async () => {
    const plainObject = {
      tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
    };

    const { dto, errors } = await transformAndValidate(plainObject);

    expect(errors.length).toBe(0);
    expect(dto.tipoMateriaPrima).toBe(TipoMateriaPrima.LECHE_CRUDA);
    expect(dto.diasHistorico).toBe(14); // Valor por defecto
  });

  it('debe transformar cadenas numéricas de la query string a number en diasHistorico', async () => {
    const plainObject = {
      tipoMateriaPrima: TipoMateriaPrima.CREMA_DE_LECHE,
      diasHistorico: '30',
    };

    const { dto, errors } = await transformAndValidate(plainObject);

    expect(errors.length).toBe(0);
    expect(dto.diasHistorico).toBe(30);
    expect(typeof dto.diasHistorico).toBe('number');
  });

  it('debe retornar error si tipoMateriaPrima no es un enum válido', async () => {
    const plainObject = {
      tipoMateriaPrima: 'MATERIA_PRIMA_INEXISTENTE',
    };

    const { errors } = await transformAndValidate(plainObject);

    expect(errors.length).toBeGreaterThan(0);
    const errorTipo = errors.find((e) => e.property === 'tipoMateriaPrima');
    expect(errorTipo).toBeDefined();
    expect(errorTipo?.constraints).toHaveProperty('isEnum');
  });

  it('debe retornar error si diasHistorico es menor a 7 (Min)', async () => {
    const plainObject = {
      tipoMateriaPrima: TipoMateriaPrima.MASA_HILADA,
      diasHistorico: 5,
    };

    const { errors } = await transformAndValidate(plainObject);

    expect(errors.length).toBe(1);
    expect(errors[0].property).toBe('diasHistorico');
    expect(errors[0].constraints).toHaveProperty('min');
  });

  it('debe retornar error si diasHistorico es mayor a 90 (Max)', async () => {
    const plainObject = {
      tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
      diasHistorico: 100,
    };

    const { errors } = await transformAndValidate(plainObject);

    expect(errors.length).toBe(1);
    expect(errors[0].property).toBe('diasHistorico');
    expect(errors[0].constraints).toHaveProperty('max');
  });

  it('debe retornar error si diasHistorico no es un número entero', async () => {
    const plainObject = {
      tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
      diasHistorico: 12.5,
    };

    const { errors } = await transformAndValidate(plainObject);

    expect(errors.length).toBe(1);
    expect(errors[0].property).toBe('diasHistorico');
    expect(errors[0].constraints).toHaveProperty('isInt');
  });
});