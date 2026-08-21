import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTamboDto } from '../dto/create-tambo.dto';

describe('CreateTamboDto', () => {
  it('debe pasar la validación con todos los campos válidos', async () => {
    const plainData = {
      nombre: 'Tambo La Esperanza',
      ubicacion: 'Ruta 6 km 12, Cañuelas',
      proveedorId: 10,
    };

    const dto = plainToInstance(CreateTamboDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('debe pasar la validación omitiendo el campo opcional ubicacion', async () => {
    const plainData = {
      nombre: 'Tambo El Ombú',
      proveedorId: 5,
    };

    const dto = plainToInstance(CreateTamboDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('debe fallar si nombre está vacío o no es un string', async () => {
    const plainData = {
      nombre: '',
      proveedorId: 1,
    };

    const dto = plainToInstance(CreateTamboDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('nombre');
  });

  it('debe fallar si nombre supera los 150 caracteres', async () => {
    const plainData = {
      nombre: 'A'.repeat(151),
      proveedorId: 1,
    };

    const dto = plainToInstance(CreateTamboDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('nombre');
    expect(errors[0].constraints?.maxLength).toBeDefined();
  });

  it('debe fallar si ubicacion supera los 255 caracteres', async () => {
    const plainData = {
      nombre: 'Tambo San Martín',
      ubicacion: 'B'.repeat(256),
      proveedorId: 1,
    };

    const dto = plainToInstance(CreateTamboDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('ubicacion');
    expect(errors[0].constraints?.maxLength).toBeDefined();
  });

  it('debe fallar si proveedorId no es un número entero', async () => {
    const plainData = {
      nombre: 'Tambo San Martín',
      proveedorId: 'no-es-un-entero',
    };

    const dto = plainToInstance(CreateTamboDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('proveedorId');
    expect(errors[0].constraints?.isInt).toBeDefined();
  });
});