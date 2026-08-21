import { plainToInstance } from 'class-transformer';
import { TamboResponseDto } from '../dto/tambo-response.dto';

describe('TamboResponseDto', () => {
  const mockDate = new Date('2026-01-15T10:00:00.000Z');

  it('debe instanciar y asignar correctamente todas las propiedades', () => {
    const dto = new TamboResponseDto();
    dto.id = 1;
    dto.nombre = 'Tambo La Esperanza';
    dto.ubicacion = 'Ruta 6 km 12, Cañuelas';
    dto.activo = true;
    dto.empresaId = 10;
    dto.proveedorId = 5;
    dto.createdAt = mockDate;

    expect(dto.id).toBe(1);
    expect(dto.nombre).toBe('Tambo La Esperanza');
    expect(dto.ubicacion).toBe('Ruta 6 km 12, Cañuelas');
    expect(dto.activo).toBe(true);
    expect(dto.empresaId).toBe(10);
    expect(dto.proveedorId).toBe(5);
    expect(dto.createdAt).toEqual(mockDate);
  });

  it('debe permitir ubicacion como null o undefined', () => {
    const dtoWithNull = new TamboResponseDto();
    dtoWithNull.ubicacion = null;

    const dtoWithUndefined = new TamboResponseDto();
    dtoWithUndefined.ubicacion = undefined;

    expect(dtoWithNull.ubicacion).toBeNull();
    expect(dtoWithUndefined.ubicacion).toBeUndefined();
  });

  it('debe mapear correctamente desde un objeto plano mediante class-transformer', () => {
    const plainData = {
      id: 2,
      nombre: 'Tambo San José',
      ubicacion: null,
      activo: false,
      empresaId: 10,
      proveedorId: 3,
      createdAt: mockDate.toISOString(),
    };

    const instance = plainToInstance(TamboResponseDto, plainData);

    expect(instance).toBeInstanceOf(TamboResponseDto);
    expect(instance.id).toBe(2);
    expect(instance.nombre).toBe('Tambo San José');
    expect(instance.ubicacion).toBeNull();
    expect(instance.activo).toBe(false);
    expect(instance.empresaId).toBe(10);
    expect(instance.proveedorId).toBe(3);
  });
});