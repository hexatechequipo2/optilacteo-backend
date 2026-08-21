import { plainToInstance } from 'class-transformer';
import { UsuarioResumenDto } from '../dto/usuario-resumen.dto';

describe('UsuarioResumenDto', () => {
  it('debe instanciar correctamente la clase DTO con sus propiedades', () => {
    const plainData = {
      id: 10,
      name: 'Juan Pérez',
      email: 'juan.perez@empresa.com',
    };

    const dto = plainToInstance(UsuarioResumenDto, plainData);

    expect(dto).toBeInstanceOf(UsuarioResumenDto);
    expect(dto.id).toBe(10);
    expect(dto.name).toBe('Juan Pérez');
    expect(dto.email).toBe('juan.perez@empresa.com');
  });
});