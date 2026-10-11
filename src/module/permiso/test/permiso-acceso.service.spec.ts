import { ForbiddenException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PermisoService } from '../permiso.service';
import { filasPermisosPorDefecto } from '../constants/permisos-por-defecto.constant';
import {
  aFlags,
  MAPA_APROBADO,
  matrizComoMapa,
} from './matriz-aprobada.fixture';
import { ModuloAdministrativo } from '../enums/modulo-administrativo.enum';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';

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

  describe('matriz por defecto de los roles de catálogo', () => {
    it('la constante es exactamente la matriz aprobada, rol por rol', () => {
      expect(matrizComoMapa(filasPermisosPorDefecto())).toEqual(MAPA_APROBADO);
    });

    it('la copia literal de la migración 1791094778511 es la matriz aprobada', () => {
      const fuente = readFileSync(
        join(
          __dirname,
          '../../../migrations/1791094778511-MatrizPermisosPorDefecto.ts',
        ),
        'utf8',
      );
      const filas = [
        ...fuente.matchAll(
          /\('([^']+)', '([a-z_]+)',\s*(true|false),\s*(true|false),\s*(true|false),\s*(true|false),\s*(true|false)\)/g,
        ),
      ].map(([, rol, modulo, r, c, u, d, e]) => ({
        rol,
        modulo,
        canRead: r === 'true',
        canCreate: c === 'true',
        canUpdate: u === 'true',
        canDelete: d === 'true',
        canExport: e === 'true',
      }));

      expect(matrizComoMapa(filas)).toEqual(MAPA_APROBADO);
    });

    it('nunca otorga plataforma ni filas vacías', () => {
      const filas = filasPermisosPorDefecto();
      expect(filas.map((f) => f.modulo)).not.toContain(
        ModuloAdministrativo.PLATAFORMA,
      );
      expect(filas.every((f) => aFlags(f) !== '')).toBe(true);
    });
  });

  describe('otorgarPermisosPorDefecto', () => {
    it('inserta la matriz completa para la empresa indicada, con el EntityManager de la transacción si viene', async () => {
      const m = { query: jest.fn() };

      await service.otorgarPermisosPorDefecto(42, m as never);

      expect(query).not.toHaveBeenCalled();
      const [sql, params] = m.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain(
        'ON CONFLICT ("empresaId","rolId","modulo") DO NOTHING',
      );
      expect(params.at(-1)).toBe(42);

      // Reconstruye las filas desde los parámetros (8 por fila).
      const filas = [];
      for (let i = 0; i < params.length - 1; i += 8) {
        const [rol, modulo, r, w, c, u, d, e] = params.slice(i, i + 8) as [
          string,
          string,
          ...boolean[],
        ];
        expect(w).toBe(c || u || d);
        filas.push({
          rol,
          modulo,
          canRead: r,
          canCreate: c,
          canUpdate: u,
          canDelete: d,
          canExport: e,
        });
      }
      expect(matrizComoMapa(filas)).toEqual(MAPA_APROBADO);
    });

    it('sin EntityManager usa el del repositorio', async () => {
      await service.otorgarPermisosPorDefecto(7);
      expect(query).toHaveBeenCalledTimes(1);
    });
  });
});
