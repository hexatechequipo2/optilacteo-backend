import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateTamboDto } from '../dto/update-tambo.dto';

describe('UpdateTamboDto', () => {
  it('debe pasar la validación al enviar un objeto vacío (todos los campos son opcionales)', async () => {
    const plainData = {};

    const dto = plainToInstance(UpdateTamboDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('debe permitir actualizar únicamente el nombre', async () => {
    const plainData = {
      nombre: 'Nuevo Nombre Tambo',
    };

    const dto = plainToInstance(UpdateTamboDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('debe permitir actualizar únicamente la ubicación', async () => {
    const plainData = {
      ubicacion: 'Nueva Ruta 8 Km 45',
    };

    const dto = plainToInstance(UpdateTamboDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('debe fallar si el nombre supera los 150 caracteres', async () => {
    const plainData = {
      nombre: 'A'.repeat(151),
    };

    const dto = plainToInstance(UpdateTamboDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('nombre');
    expect(errors[0].constraints?.maxLength).toBeDefined();
  });

  it('debe fallar si la ubicación supera los 255 caracteres', async () => {
    const plainData = {
      ubicacion: 'B'.repeat(256),
    };

    const dto = plainToInstance(UpdateTamboDto, plainData);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('ubicacion');
    expect(errors[0].constraints?.maxLength).toBeDefined();
  });

  it('debe ignorar o no validar proveedorId si se envía (por OmitType)', async () => {
    const plainData = {
      nombre: 'Tambo Modificado',
      proveedorId: 'no-es-un-numero-valido', // Debería fallar en CreateTamboDto, pero aquí se omite el campo
    };

    const dto = plainToInstance(UpdateTamboDto, plainData);
    const errors = await validate(dto);

    // No debe haber errores sobre proveedorId porque fue excluido con OmitType
    const proveedorError = errors.find((e) => e.property === 'proveedorId');
    expect(proveedorError).toBeUndefined();
  });
});