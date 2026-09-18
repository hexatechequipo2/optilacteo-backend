import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateDestinoProductivoDto } from '../dto/create-destino-productivo.dto';

describe('CreateDestinoProductivoDto — validaciones de entrada (HU-49)', () => {
  it('cuando el nombre es válido, debe superar la validación correctamente', async () => {

    const plainObject = {
      nombre: 'Manteca',
    };

    const dto = plainToInstance(CreateDestinoProductivoDto, plainObject);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
    expect(dto).toBeInstanceOf(CreateDestinoProductivoDto);
  });

  it('cuando el nombre está vacío, debe retornar error de validación por isNotEmpty', async () => {
    const plainObject = {
      nombre: '',
    };

    const dto = plainToInstance(CreateDestinoProductivoDto, plainObject);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('nombre');
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('cuando el nombre no es una cadena de texto, debe retornar error de validación por isString', async () => {
    const plainObject = {
      nombre: 12345,
    };

    const dto = plainToInstance(CreateDestinoProductivoDto, plainObject);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('nombre');
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('cuando el nombre supera el límite de 100 caracteres, debe retornar error por maxLength', async () => {
    const plainObject = {
      nombre: 'a'.repeat(101),
    };

    const dto = plainToInstance(CreateDestinoProductivoDto, plainObject);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('nombre');
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });
});