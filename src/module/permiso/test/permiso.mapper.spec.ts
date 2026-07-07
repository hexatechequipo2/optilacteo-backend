import { PermisoMapper } from '../mappers/permiso.mapper';
import { PermisoModulo } from '../entities/permiso-modulo.entity';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';

function buildPermiso(overrides: Partial<PermisoModulo> = {}): PermisoModulo {
  return {
    id: 1,
    modulo: ModuloSistema.DASHBOARD,
    canRead: true,
    canWrite: false,
    rol: { id: 5, nombre: 'Gerente' } as PermisoModulo['rol'],
    ...overrides,
  } as PermisoModulo;
}

describe('PermisoMapper', () => {
  describe('toResponse', () => {
    it('deberia mapear id, modulo, canRead/canWrite y el rol asociado', () => {
      const permiso = buildPermiso();

      const result = PermisoMapper.toResponse(permiso);

      expect(result).toEqual({
        id: 1,
        modulo: ModuloSistema.DASHBOARD,
        canRead: true,
        canWrite: false,
        rol: { id: 5, nombre: 'Gerente' },
      });
    });

    it('deberia devolver rol en null cuando la relacion no fue cargada', () => {
      const permiso = buildPermiso({ rol: undefined as never });

      const result = PermisoMapper.toResponse(permiso);

      expect(result.rol).toBeNull();
    });

    it('deberia reflejar canWrite en true cuando el permiso tiene escritura habilitada', () => {
      const permiso = buildPermiso({ canRead: true, canWrite: true });

      const result = PermisoMapper.toResponse(permiso);

      expect(result.canWrite).toBe(true);
    });
  });

  describe('toResponseList', () => {
    it('deberia mapear cada permiso preservando el orden', () => {
      const permisos = [
        buildPermiso({ id: 1, modulo: ModuloSistema.DASHBOARD }),
        buildPermiso({ id: 2, modulo: ModuloSistema.RECEPCION }),
      ];

      const result = PermisoMapper.toResponseList(permisos);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 1, modulo: ModuloSistema.DASHBOARD });
      expect(result[1]).toMatchObject({ id: 2, modulo: ModuloSistema.RECEPCION });
    });

    it('deberia devolver un array vacio cuando no hay permisos', () => {
      expect(PermisoMapper.toResponseList([])).toEqual([]);
    });
  });

  describe('toUserPermisoResponse - permisos efectivos de un usuario (via su rol)', () => {
    it('deberia exponer solo modulo/canRead/canWrite, sin id ni rol', () => {
      const permisos = [
        buildPermiso({ modulo: ModuloSistema.DASHBOARD, canRead: true, canWrite: false }),
        buildPermiso({ modulo: ModuloSistema.RECEPCION, canRead: true, canWrite: true }),
      ];

      const result = PermisoMapper.toUserPermisoResponse(permisos);

      expect(result).toEqual([
        { modulo: ModuloSistema.DASHBOARD, canRead: true, canWrite: false },
        { modulo: ModuloSistema.RECEPCION, canRead: true, canWrite: true },
      ]);
      expect(result[0]).not.toHaveProperty('id');
      expect(result[0]).not.toHaveProperty('rol');
    });

    it('deberia devolver un array vacio cuando el usuario no tiene permisos', () => {
      expect(PermisoMapper.toUserPermisoResponse([])).toEqual([]);
    });
  });
});
