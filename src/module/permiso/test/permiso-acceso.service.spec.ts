import { ForbiddenException } from '@nestjs/common';
import { PERMISOS_ADMIN_POR_DEFECTO, PermisoService } from '../permiso.service';
import { ModuloAdministrativo } from '../enums/modulo-administrativo.enum';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';
import { ROLES } from '../../rol/constants/roles.constants';

describe('PermisoService — acceso del usuario (HU-72)', () => {
  let service: PermisoService;
  let getOne: jest.Mock;
  let select: jest.Mock;
  let where: jest.Mock;
  let find: jest.Mock;
  let query: jest.Mock;

  const filaPermiso = {
    id: 10,
    empresaId: 1,
    modulo: ModuloSistema.SENSORES_IOT,
    canRead: true,
    canWrite: true,
    canCreate: true,
    canUpdate: false,
    canDelete: false,
    canExport: false,
  };

  beforeEach(() => {
    getOne = jest.fn();
    select = jest.fn();
    where = jest.fn();
    const qb = {
      leftJoin: jest.fn().mockReturnThis(),
      select: select.mockReturnThis(),
      where: where.mockReturnThis(),
      getOne,
    };
    find = jest.fn().mockResolvedValue([filaPermiso]);
    query = jest.fn();
    service = new PermisoService(
      {} as never,
      { createQueryBuilder: () => qb } as never,
      { find, manager: { query } } as never,
    );
  });

  const usuario = (
    rol: Record<string, unknown>,
    empresaId: number | null = 1,
  ) => ({
    id: 7,
    isActive: true,
    rol: {
      id: 3,
      nombre: 'Operario de línea',
      isActive: true,
      esSistema: false,
      ...rol,
    },
    empresa: empresaId === null ? null : { id: empresaId },
  });

  describe('obtenerAcceso', () => {
    it('trae el nombre del rol desde la BD', async () => {
      getOne.mockResolvedValue(usuario({}));

      const acceso = await service.obtenerAcceso(7);

      expect(select).toHaveBeenCalledWith(expect.arrayContaining(['r.nombre']));
      expect(acceso).toEqual({
        userId: 7,
        rolId: 3,
        rolNombre: 'Operario de línea',
        empresaId: 1,
        esSistema: false,
        permisos: [filaPermiso],
      });
    });

    it('filtra los permisos por la empresa vigente del usuario (multi-tenant)', async () => {
      getOne.mockResolvedValue(usuario({}, 2));

      await service.obtenerAcceso(7);

      expect(find).toHaveBeenCalledWith({
        where: { empresaId: 2, rol: { id: 3 } },
      });
    });

    it('rol de sistema: no consulta la matriz', async () => {
      getOne.mockResolvedValue(
        usuario({ id: 1, nombre: 'Administrador', esSistema: true }, null),
      );

      const acceso = await service.obtenerAcceso(1);

      expect(acceso).toMatchObject({
        esSistema: true,
        rolNombre: 'Administrador',
        permisos: [],
      });
      expect(find).not.toHaveBeenCalled();
    });
  });

  describe('obtenerMisPermisos', () => {
    it('devuelve el DTO con los flags de cada módulo', async () => {
      getOne.mockResolvedValue(usuario({ id: 40, nombre: 'Ingesta IoT' }));

      await expect(service.obtenerMisPermisos(7)).resolves.toEqual({
        esSistema: false,
        rolNombre: 'Ingesta IoT',
        permisos: [
          {
            modulo: ModuloSistema.SENSORES_IOT,
            canRead: true,
            canCreate: true,
            canUpdate: false,
            canDelete: false,
            canExport: false,
          },
        ],
      });
    });

    it('lanza 403 si el usuario no tiene rol activo', async () => {
      getOne.mockResolvedValue(usuario({ isActive: false }));

      await expect(service.obtenerMisPermisos(7)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('otorgarPermisosAdministrativosPorDefecto', () => {
    it('el set por defecto coincide con el backfill de la migración', () => {
      const resumen = PERMISOS_ADMIN_POR_DEFECTO.map((p) => [
        p.rol,
        p.modulo,
        p.canRead,
        p.canCreate,
        p.canUpdate,
        p.canDelete,
      ]);
      expect(resumen).toEqual([
        [
          ROLES.GERENTE,
          ModuloAdministrativo.GESTION_ROLES,
          true,
          true,
          true,
          true,
        ],
        [
          ROLES.GERENTE,
          ModuloAdministrativo.GESTION_USUARIOS,
          true,
          true,
          true,
          false,
        ],
        [
          ROLES.GERENTE,
          ModuloAdministrativo.CONFIGURACION_EMPRESA,
          true,
          false,
          true,
          false,
        ],
        [
          ROLES.RESPONSABLE_CALIDAD,
          ModuloAdministrativo.GESTION_USUARIOS,
          true,
          false,
          false,
          false,
        ],
      ]);
    });

    it('inserta para la empresa indicada, con el EntityManager de la transacción si viene', async () => {
      const m = { query: jest.fn() };

      await service.otorgarPermisosAdministrativosPorDefecto(42, m as never);

      expect(query).not.toHaveBeenCalled();
      const [sql, params] = m.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain(
        'ON CONFLICT ("empresaId","rolId","modulo") DO NOTHING',
      );
      expect(params.at(-1)).toBe(42);
      expect(params).toHaveLength(PERMISOS_ADMIN_POR_DEFECTO.length * 8 + 1);
    });
  });
});
