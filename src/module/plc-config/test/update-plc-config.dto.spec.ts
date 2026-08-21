import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdatePlcConfigDto } from '../dto/update-plc-config.dto';

describe('UpdatePlcConfigDto', () => {
  it('debe pasar la validación con una URL HTTP válida con IP y puerto', async () => {
    const plainData = { url: 'http://192.168.1.50:8080/api/lecturas' };
    const dto = plainToInstance(UpdatePlcConfigDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('debe pasar la validación con una URL HTTPS válida con dominio', async () => {
    const plainData = { url: 'https://gateway.empresa.com/plc' };
    const dto = plainToInstance(UpdatePlcConfigDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('debe fallar la validación si la URL carece de protocolo', async () => {
    const plainData = { url: '192.168.1.50:8080/api/lecturas' };
    const dto = plainToInstance(UpdatePlcConfigDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('url');
    expect(errors[0].constraints?.isUrl).toBe('La URL del PLC no tiene un formato válido');
  });

  it('debe fallar si se utiliza un protocolo no permitido (ej. mqtt o ftp)', async () => {
    const plainData = { url: 'mqtt://192.168.1.50:1883' };
    const dto = plainToInstance(UpdatePlcConfigDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('url');
  });

  it('debe fallar la validación si el valor está vacío', async () => {
    const plainData = { url: '' };
    const dto = plainToInstance(UpdatePlcConfigDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('url');
  });
});