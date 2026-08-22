import { ConfiguracionNotificacionNivel } from '../entities/configuracion-notificacion-nivel.entity';
import { NivelAlerta } from '../enums/nivel-alerta.enum';
import { Rol } from '../../rol/entities/rol.entity';
import { User } from '../../user/entities/user.entity';

describe('ConfiguracionNotificacionNivel Entity', () => {
  it('debe instanciar correctamente la entidad asignada a un Rol', () => {
    const config = new ConfiguracionNotificacionNivel();
    const rol = { id: 2, nombre: 'OPERADOR' } as Rol;

    config.id = 1;
    config.empresaId = 10;
    config.nivelAlerta = NivelAlerta.ADVERTENCIA;
    config.rolId = 2;
    config.rol = rol;
    config.usuarioId = null;
    config.usuario = null;
    config.createdAt = new Date('2026-08-21T10:00:00Z');

    expect(config).toBeInstanceOf(ConfiguracionNotificacionNivel);
    expect(config.id).toBe(1);
    expect(config.empresaId).toBe(10);
    expect(config.nivelAlerta).toBe(NivelAlerta.ADVERTENCIA);
    expect(config.rolId).toBe(2);
    expect(config.rol).toEqual(rol);
    expect(config.usuarioId).toBeNull();
    expect(config.usuario).toBeNull();
  });

  it('debe instanciar correctamente la entidad asignada a un Usuario puntual', () => {
    const config = new ConfiguracionNotificacionNivel();
    const usuario = { id: 5, email: 'user@test.com' } as User;

    config.id = 2;
    config.empresaId = 10;
    config.nivelAlerta = NivelAlerta.CRITICA;
    config.rolId = null;
    config.rol = null;
    config.usuarioId = 5;
    config.usuario = usuario;
    config.createdAt = new Date('2026-08-21T10:00:00Z');

    expect(config).toBeInstanceOf(ConfiguracionNotificacionNivel);
    expect(config.id).toBe(2);
    expect(config.nivelAlerta).toBe(NivelAlerta.CRITICA);
    expect(config.usuarioId).toBe(5);
    expect(config.usuario).toEqual(usuario);
    expect(config.rolId).toBeNull();
  });
});