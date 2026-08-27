import { ConfiguracionNotificacionMapper } from '../mappers/configuracion-notificacion.mapper';
import { ConfiguracionNotificacionNivel } from '../entities/configuracion-notificacion-nivel.entity';
import { NivelAlerta } from '../enums/nivel-alerta.enum';
import { Rol } from '../../rol/entities/rol.entity';
import { User } from '../../user/entities/user.entity';

describe('ConfiguracionNotificacionMapper', () => {
  const mockDate = new Date('2026-08-21T10:00:00Z');

  describe('toResponse', () => {
    it('debe mapear correctamente una entidad con Rol (sin usuario)', () => {
      const entity: ConfiguracionNotificacionNivel = {
        id: 1,
        nivelAlerta: NivelAlerta.ADVERTENCIA,
        rolId: 2,
        rol: { id: 2, nombre: 'ADMIN' } as Rol,
        usuarioId: null,
        usuario: null,
        empresaId: 10,
        createdAt: mockDate,
      };

      const result = ConfiguracionNotificacionMapper.toResponse(entity);

      expect(result).toEqual({
        id: 1,
        nivelAlerta: NivelAlerta.ADVERTENCIA,
        rolId: 2,
        rol: { id: 2, nombre: 'ADMIN' },
        usuarioId: null,
        usuario: null,
        empresaId: 10,
        createdAt: mockDate,
      });
    });

    it('debe mapear correctamente una entidad con Usuario (sin rol)', () => {
      const entity: ConfiguracionNotificacionNivel = {
        id: 2,
        nivelAlerta: NivelAlerta.CRITICA,
        rolId: null,
        rol: null,
        usuarioId: 5,
        usuario: { id: 5, name: 'Juan', email: 'juan@test.com' } as User,
        empresaId: 10,
        createdAt: mockDate,
      };

      const result = ConfiguracionNotificacionMapper.toResponse(entity);

      expect(result).toEqual({
        id: 2,
        nivelAlerta: NivelAlerta.CRITICA,
        rolId: null,
        rol: null,
        usuarioId: 5,
        usuario: { id: 5, name: 'Juan', email: 'juan@test.com' },
        empresaId: 10,
        createdAt: mockDate,
      });
    });

    it('debe manejar campos opcionales o nulos correctamente', () => {
      const entity: ConfiguracionNotificacionNivel = {
        id: 3,
        nivelAlerta: NivelAlerta.INFORMATIVA,
        rolId: undefined,
        rol: null,
        usuarioId: undefined,
        usuario: null,
        empresaId: 10,
        createdAt: mockDate,
      };

      const result = ConfiguracionNotificacionMapper.toResponse(entity);

      expect(result.rolId).toBeNull();
      expect(result.usuarioId).toBeNull();
      expect(result.rol).toBeNull();
      expect(result.usuario).toBeNull();
    });
  });

  describe('toResponseList', () => {
    it('debe mapear un arreglo de entidades a un arreglo de DTOs', () => {
      const entities: ConfiguracionNotificacionNivel[] = [
        {
          id: 1,
          nivelAlerta: NivelAlerta.ADVERTENCIA,
          rolId: 2,
          rol: { id: 2, nombre: 'ADMIN' } as Rol,
          usuarioId: null,
          usuario: null,
          empresaId: 10,
          createdAt: mockDate,
        },
      ];

      const result = ConfiguracionNotificacionMapper.toResponseList(entities);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });
});