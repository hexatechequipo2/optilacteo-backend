import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ParsearDictadoDto } from '../dto/parsear-dictado.dto';

describe('ParsearDictadoDto — validación de DTO de entrada (HU-XX)', () => {
  it('cuando el texto cumple con todos los requisitos de formato y longitud, la validación debe ser exitosa', async () => {
    const plainObject = {
      texto: 'grasa 3,6 coma proteína 3,2, acidez 14 temperatura 4',
    };

    const dto = plainToInstance(ParsearDictadoDto, plainObject);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('cuando el campo texto está vacío, debe retornar un error de validación', async () => {
    const plainObject = {
      texto: '',
    };

    const dto = plainToInstance(ParsearDictadoDto, plainObject);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('texto');
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('cuando el campo texto no es una cadena de caracteres, debe retornar un error de tipo', async () => {
    const plainObject = {
      texto: 12345,
    };

    const dto = plainToInstance(ParsearDictadoDto, plainObject);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('texto');
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('cuando el campo texto supera el límite de 2000 caracteres, debe retornar un error de longitud máxima', async () => {
    const plainObject = {
      texto: 'a'.repeat(2001),
    };

    const dto = plainToInstance(ParsearDictadoDto, plainObject);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('texto');
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });
});