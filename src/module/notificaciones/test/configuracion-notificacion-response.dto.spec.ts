import { plainToInstance } from 'class-transformer';
import {
  ConfiguracionNotificacionResponseDto,
  RolResumenDto,
} from '../dto/configuracion-notificacion-response.dto';
import { NivelAlerta } from '../enums/nivel-alerta.enum';

describe('ConfiguracionNotificacionResponseDto', () => {
  it('debe instanciar correctamente la clase DTO y sus sub-DTOs', () => {
    const plainData = {
      id: 1,
      nivelAlerta: NivelAlerta.CRITICA,
      rolId: 2,
      rol: { id: 2, nombre: 'ADMIN' },
      usuarioId: null,
      usuario: null,
      empresaId: 10,
      createdAt: new Date(),
    };

    const dto = plainToInstance(
      ConfiguracionNotificacionResponseDto,
      plainData,
    );

    expect(dto).toBeInstanceOf(ConfiguracionNotificacionResponseDto);
    expect(dto.id).toBe(1);
    expect(dto.nivelAlerta).toBe(NivelAlerta.CRITICA);
    expect(dto.rol).toEqual({ id: 2, nombre: 'ADMIN' });
    expect(dto.usuario).toBeNull();
  });

  it('debe instanciar correctamente RolResumenDto', () => {
    const plainRol = { id: 1, nombre: 'OPERADOR' };
    const rolDto = plainToInstance(RolResumenDto, plainRol);

    expect(rolDto).toBeInstanceOf(RolResumenDto);
    expect(rolDto.id).toBe(1);
    expect(rolDto.nombre).toBe('OPERADOR');
  });
});
