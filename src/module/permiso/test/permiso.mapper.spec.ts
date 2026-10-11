import { PermisoMapper } from '../mappers/permiso.mapper';
import { PermisoModulo } from '../entities/permiso-modulo.entity';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';

function buildPermiso(overrides: Partial<PermisoModulo> = {}): PermisoModulo {
  return {
    id: 1,
    modulo: ModuloSistema.DASHBOARD,
    canRead: true,
    canWrite: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canExport: false,
    rol: { id: 5, nombre: 'Gerente' } as PermisoModulo['rol'],
    ...overrides,
    empresa: overrides.empresa ?? ({} as PermisoModulo['empresa']),
    empresaId: overrides.empresaId ?? 1,
  };
}

describe('PermisoMapper', () => {
  describe('toResponse', () => {
    it('deberia mapear id, modulo, permisos granulares (canRead, canCreate, canUpdate, canDelete, canExport) y el rol asociado', () => {
      const permiso = buildPermiso();

      const result = PermisoMapper.toResponse(permiso);

      expect(result).toEqual({
        id: 1,
        modulo: ModuloSistema.DASHBOARD,
        canRead: true,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canExport: false,
        rol: { id: 5, nombre: 'Gerente' },
      });
    });

    it('deberia devolver rol en null cuando la relacion no fue cargada', () => {
      const permiso = buildPermiso({ rol: undefined as never });

      const result = PermisoMapper.toResponse(permiso);

      expect(result.rol).toBeNull();
    });

    it('deberia reflejar permisos de edicion/creacion en true cuando estan habilitados', () => {
      const permiso = buildPermiso({ canRead: true, canCreate: true, canUpdate: true });

      const result = PermisoMapper.toResponse(permiso);

      expect(result.canCreate).toBe(true);
      expect(result.canUpdate).toBe(true);
      expect(result.canDelete).toBe(false);
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
      expect(result[0]).toMatchObject({
        id: 1,
        modulo: ModuloSistema.DASHBOARD,
      });
      expect(result[1]).toMatchObject({
        id: 2,
        modulo: ModuloSistema.RECEPCION,
      });
    });

    it('deberia devolver un array vacio cuando no hay permisos', () => {
      expect(PermisoMapper.toResponseList([])).toEqual([]);
    });
  });

  describe('toUserPermisoResponse - permisos efectivos de un usuario (via su rol)', () => {
    it('deberia exponer solo modulo y flags de permisos (canRead, canCreate, canUpdate, canDelete, canExport), sin id ni rol', () => {
      const permisos = [
        buildPermiso({
          modulo: ModuloSistema.DASHBOARD,
          canRead: true,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canExport: false,
        }),
        buildPermiso({
          modulo: ModuloSistema.RECEPCION,
          canRead: true,
          canCreate: true,
          canUpdate: true,
          canDelete: false,
          canExport: true,
        }),
      ];

      const result = PermisoMapper.toUserPermisoResponse(permisos);

      expect(result).toEqual([
        {
          modulo: ModuloSistema.DASHBOARD,
          canRead: true,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canExport: false,
        },
        {
          modulo: ModuloSistema.RECEPCION,
          canRead: true,
          canCreate: true,
          canUpdate: true,
          canDelete: false,
          canExport: true,
        },
      ]);
      expect(result[0]).not.toHaveProperty('id');
      expect(result[0]).not.toHaveProperty('rol');
      expect(result[0]).not.toHaveProperty('canWrite');
    });

    it('deberia devolver un array vacio cuando el usuario no tiene permisos', () => {
      expect(PermisoMapper.toUserPermisoResponse([])).toEqual([]);
    });
  });
});