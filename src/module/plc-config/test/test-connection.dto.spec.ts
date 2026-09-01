import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { TestConnectionDto } from '../dto/test-connection.dto';

describe('TestConnectionDto', () => {
  it('debe pasar la validación con una URL HTTP válida con IP y puerto', async () => {
    const plainData = { url: 'http://192.168.1.50:8080/api/lecturas' };
    const dto = plainToInstance(TestConnectionDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('debe pasar la validación con una URL HTTPS con dominio', async () => {
    const plainData = { url: 'https://plc.empresa.com/api/v1/data' };
    const dto = plainToInstance(TestConnectionDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('debe fallar la validación si la URL no incluye protocolo (http/https)', async () => {
    const plainData = { url: '192.168.1.50:8080/api/lecturas' };
    const dto = plainToInstance(TestConnectionDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('url');
    expect(errors[0].constraints?.isUrl).toBe(
      'La URL del PLC no tiene un formato válido',
    );
  });

  it('debe fallar la validación con un protocolo no permitido (ej. ftp)', async () => {
    const plainData = { url: 'ftp://192.168.1.50/api' };
    const dto = plainToInstance(TestConnectionDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('url');
  });

  it('debe fallar la validación si el valor no es una cadena de texto o está vacío', async () => {
    const plainData = { url: '' };
    const dto = plainToInstance(TestConnectionDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('url');
  });
});
