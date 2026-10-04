/**
 * HU-72 contra Postgres real: migraciones desde cero, backfill sobre datos
 * existentes, guard + PermisoService leyendo la BD, y el 500 que daba /roles
 * al otorgar módulos administrativos que no estaban en el enum.
 *
 * Requiere el Postgres de docker-compose (usa las credenciales del .env y
 * crea/borra su propia base). Correr con: npm run test:e2e -- permisos-hu72
 */
import 'reflect-metadata';
import { readdirSync } from 'fs';
import { join } from 'path';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import baseDataSource from '../src/data-source';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { PermisoService } from '../src/module/permiso/permiso.service';
import { PermisoModulo } from '../src/module/permiso/entities/permiso-modulo.entity';
import { User } from '../src/module/user/entities/user.entity';
import { Rol } from '../src/module/rol/entities/rol.entity';
import { RolService } from '../src/module/rol/rol.service';
import { UserController } from '../src/module/user/user.controller';
import { EmpresaController } from '../src/module/empresa/empresa.controller';
import { LecturaSensorController } from '../src/module/lectura-sensor/lectura-sensor.controller';
import { LoteController } from '../src/module/lote/lote.controller';
import { SensorController } from '../src/module/sensor/sensor.controller';
import { NotificacionesController } from '../src/module/notificaciones/notificaciones.controller';
import {
  MAPA_APROBADO,
  matrizComoMapa,
  type FilaFlags,
} from '../src/module/permiso/test/matriz-aprobada.fixture';

/* eslint-disable @typescript-eslint/unbound-method */

const DB = `optilacteo_hu72_test_${process.pid}`;
const MIGRACIONES_DIR = join(__dirname, '../src/migrations');
const HU72 = ['1791091175765', '1791091175766'];
const MATRIZ = '1791094778511';

/** excluir: prefijos de timestamp que todavía no se corren. */
const migraciones = (excluir: string[]) =>
  readdirSync(MIGRACIONES_DIR)
    .filter((f) => f.endsWith('.ts'))
    .filter((f) => !excluir.some((ts) => f.startsWith(ts)))
    .map((f) => join(MIGRACIONES_DIR, f));

const conectar = (database: string, excluir: string[] = []) =>
  new DataSource({
    ...baseDataSource.options,
    database,
    migrations: migraciones(excluir),
  } as typeof baseDataSource.options).initialize();

describe('HU-72 sobre Postgres', () => {
  let admin: DataSource;
  let ds: DataSource;
  let permisoService: PermisoService;
  let guard: PermissionsGuard;
  const ids: Record<string, number> = {};
  const backfill: Record<string, unknown> = {};

  const insertar = async (sql: string, params: unknown[]) =>
    (await ds.query<{ id: number }[]>(sql, params))[0].id;

  const rolCatalogo = async (nombre: string) =>
    (
      await ds.query<{ id: number }[]>(
        `SELECT id FROM roles WHERE nombre = $1 AND "empresaId" IS NULL`,
        [nombre],
      )
    )[0].id;

  const usuario = (nombre: string, rolId: number, empresaId: number | null) =>
    insertar(
      `INSERT INTO users (name, email, password, "rolId", "empresaId") VALUES ($1, $2, 'x', $3, $4) RETURNING id`,
      [nombre, `${nombre}@hu72.test`, rolId, empresaId],
    );

  const pasa = (handler: object, userId: number) =>
    guard.canActivate({
      getHandler: () => handler,
      getClass: () => Object,
      switchToHttp: () => ({ getRequest: () => ({ user: { sub: userId } }) }),
    } as unknown as ExecutionContext);

  /** Filas de los roles de catálogo (sin Administrador) de una empresa. */
  const matrizCatalogo = async (empresaId: number) =>
    matrizComoMapa(
      await ds.query<FilaFlags[]>(
        `SELECT r.nombre AS rol, p.modulo::text AS modulo, p."canRead", p."canCreate", p."canUpdate", p."canDelete", p."canExport"
           FROM permiso_modulos p JOIN roles r ON r.id = p."rolId"
          WHERE p."empresaId" = $1 AND r."empresaId" IS NULL AND NOT r."esSistema"`,
        [empresaId],
      ),
    );

  const filas = (empresaId: number) =>
    ds.query(
      `SELECT r.nombre AS rol, p.modulo::text AS modulo, p."canRead" r, p."canCreate" c, p."canUpdate" u, p."canDelete" d
         FROM permiso_modulos p JOIN roles r ON r.id = p."rolId"
        WHERE p."empresaId" = $1 AND p.modulo::text IN ('gestion_usuarios','configuracion_empresa')
        ORDER BY 1, 2`,
      [empresaId],
    );

  beforeAll(async () => {
    admin = await conectar('postgres');
    await admin.query(`DROP DATABASE IF EXISTS "${DB}"`);
    await admin.query(`CREATE DATABASE "${DB}"`);

    // 1) Base limpia con todas las migraciones previas a HU-72.
    ds = await conectar(DB, [...HU72, MATRIZ]);
    await ds.runMigrations();

    // 2) Datos que ya existían antes de HU-72.
    ids.empresaA = await insertar(
      `INSERT INTO empresas (name, cuit) VALUES ('A', '30-1') RETURNING id`,
      [],
    );
    ids.empresaB = await insertar(
      `INSERT INTO empresas (name, cuit) VALUES ('B', '30-2') RETURNING id`,
      [],
    );
    ids.gerente = await rolCatalogo('Gerente');
    ids.calidad = await rolCatalogo('Responsable de calidad');
    ids.operario = await rolCatalogo('Operario de línea');
    ids.produccion = await rolCatalogo('Responsable de producción');
    ids.administrador = await rolCatalogo('Administrador');
    for (const e of [ids.empresaA, ids.empresaB]) {
      await ds.query(
        `INSERT INTO permiso_modulos (modulo, "canRead", "canWrite", "canCreate", "canUpdate", "canDelete", "canExport", "rolId", "empresaId")
         VALUES ('gestion_roles', true, true, true, true, true, false, $1, $2)`,
        [ids.gerente, e],
      );
    }
    await ds.query(
      `INSERT INTO empresa_modulos (modulo, "isActive", "empresaId") VALUES ('sensores_iot', true, $1)`,
      [ids.empresaA],
    );
    ids.rolIot = await insertar(
      `INSERT INTO roles (nombre, "empresaId") VALUES ('Ingesta IoT', $1) RETURNING id`,
      [ids.empresaA],
    );
    await ds.query(
      `INSERT INTO permiso_modulos (modulo, "canRead", "canWrite", "canCreate", "canUpdate", "canDelete", "canExport", "rolId", "empresaId")
       VALUES ('sensores_iot', false, true, true, false, false, false, $1, $2)`,
      [ids.rolIot, ids.empresaA],
    );
    ids.uGerenteA = await usuario('gerenteA', ids.gerente, ids.empresaA);
    ids.uGerenteB = await usuario('gerenteB', ids.gerente, ids.empresaB);
    ids.uCalidadA = await usuario('calidadA', ids.calidad, ids.empresaA);
    ids.uOperarioA = await usuario('operarioA', ids.operario, ids.empresaA);
    ids.uProduccionA = await usuario(
      'produccionA',
      ids.produccion,
      ids.empresaA,
    );
    ids.uIot = await usuario('iot', ids.rolIot, ids.empresaA);
    ids.uAdmin = await usuario('admin', ids.administrador, null);
    await ds.destroy();

    // 3) Migraciones de HU-72 sobre esos datos: primero enum + backfill...
    ds = await conectar(DB, [MATRIZ]);
    const ejecutadas = await ds.runMigrations();
    expect(ejecutadas.map((m) => m.name)).toEqual([
      'AmpliarModulosPermiso1791091175765',
      'BackfillPermisosAdministrativos1791091175766',
    ]);
    backfill.empresaA = await filas(ids.empresaA);
    backfill.empresaB = await filas(ids.empresaB);
    await ds.destroy();

    // ...y después la matriz por defecto.
    ds = await conectar(DB);
    const matriz = await ds.runMigrations();
    expect(matriz.map((m) => m.name)).toEqual([
      'MatrizPermisosPorDefecto1791094778511',
    ]);

    permisoService = new PermisoService(
      {} as never,
      ds.getRepository(User),
      ds.getRepository(PermisoModulo),
    );
    guard = new PermissionsGuard(new Reflector(), permisoService);
  }, 120_000);

  afterAll(async () => {
    await ds?.destroy();
    await admin?.query(`DROP DATABASE IF EXISTS "${DB}"`);
    await admin?.destroy();
  });

  it('el enum incluye los módulos administrativos nuevos', async () => {
    const [{ valores }] = await ds.query<{ valores: string[] }[]>(
      `SELECT enum_range(NULL::permiso_modulos_modulo_enum)::text[] AS valores`,
    );
    expect(valores).toEqual(
      expect.arrayContaining([
        'gestion_usuarios',
        'auditoria',
        'plataforma',
        'configuracion_empresa',
      ]),
    );
  });

  it('backfill: Gerente y Responsable de calidad reciben sus permisos en cada empresa', () => {
    const esperado = [
      {
        rol: 'Gerente',
        modulo: 'configuracion_empresa',
        r: true,
        c: false,
        u: true,
        d: false,
      },
      {
        rol: 'Gerente',
        modulo: 'gestion_usuarios',
        r: true,
        c: true,
        u: true,
        d: false,
      },
      {
        rol: 'Responsable de calidad',
        modulo: 'gestion_usuarios',
        r: true,
        c: false,
        u: false,
        d: false,
      },
    ];
    expect(backfill.empresaA).toEqual(esperado);
    expect(backfill.empresaB).toEqual(esperado);
  });

  it('matriz por defecto: cada rol de catálogo queda con exactamente la matriz aprobada, en cada empresa', async () => {
    expect(await matrizCatalogo(ids.empresaA)).toEqual(MAPA_APROBADO);
    expect(await matrizCatalogo(ids.empresaB)).toEqual(MAPA_APROBADO);
  });

  it('matriz por defecto: no toca roles personalizados', async () => {
    const filasIot = await ds.query<FilaFlags[]>(
      `SELECT modulo::text AS modulo, "canRead", "canCreate", "canUpdate", "canDelete", "canExport"
         FROM permiso_modulos WHERE "rolId" = $1`,
      [ids.rolIot],
    );
    expect(filasIot).toEqual([
      {
        modulo: 'sensores_iot',
        canRead: false,
        canCreate: true,
        canUpdate: false,
        canDelete: false,
        canExport: false,
      },
    ]);
  });

  describe('con la matriz por defecto, por rol de catálogo', () => {
    const l = LoteController.prototype;
    const s = SensorController.prototype;

    it('POST /lotes: Calidad sí; Operario y Producción no', async () => {
      await expect(pasa(l.create, ids.uCalidadA)).resolves.toBe(true);
      await expect(pasa(l.create, ids.uOperarioA)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(pasa(l.create, ids.uProduccionA)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('asociar sensores (HU-33): Operario y Producción sí; Calidad no', async () => {
      await expect(pasa(s.asociarALote, ids.uOperarioA)).resolves.toBe(true);
      await expect(pasa(s.asociarALote, ids.uProduccionA)).resolves.toBe(true);
      await expect(pasa(s.asociarALote, ids.uCalidadA)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('horarios de silencio (HU-30): Gerente y Producción sí; Operario no', async () => {
      const crear = NotificacionesController.prototype.crearHorarioSilencio;
      await expect(pasa(crear, ids.uGerenteA)).resolves.toBe(true);
      await expect(pasa(crear, ids.uProduccionA)).resolves.toBe(true);
      await expect(pasa(crear, ids.uOperarioA)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('mediciones manuales: solo el Operario', async () => {
      const ingresarManual = LecturaSensorController.prototype.ingresarManual;
      await expect(pasa(ingresarManual, ids.uOperarioA)).resolves.toBe(true);
      await expect(pasa(ingresarManual, ids.uGerenteA)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('después del backfill', () => {
    const p = UserController.prototype;
    const e = EmpresaController.prototype;

    it.each([
      ['POST /user', p.create],
      ['GET /user', p.findAll],
      ['GET /user/:id', p.findOne],
      ['PATCH /user/:id', p.update],
      ['PATCH /user/:id/activar', p.activate],
      ['PATCH /user/:id/desactivar', p.deactivate],
      ['PATCH /user/:id/desbloquear', p.unlock],
      ['PATCH /empresa/me/identidad', e.updateIdentidad],
      ['POST /empresa/me/logo', e.uploadLogo],
      ['DELETE /empresa/me/logo', e.deleteLogo],
    ])('el Gerente sigue accediendo a %s', async (_ruta, handler) => {
      await expect(pasa(handler, ids.uGerenteA)).resolves.toBe(true);
    });

    it('el Responsable de calidad conserva GET /user pero no puede crear', async () => {
      await expect(pasa(p.findAll, ids.uCalidadA)).resolves.toBe(true);
      await expect(pasa(p.create, ids.uCalidadA)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('el Operario no accede a /user y el Gerente no accede a plataforma', async () => {
      await expect(pasa(p.findAll, ids.uOperarioA)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(pasa(e.findAll, ids.uGerenteA)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('bypass de esSistema: el Administrador pasa plataforma sin filas de permiso', async () => {
      await expect(pasa(e.findAll, ids.uAdmin)).resolves.toBe(true);
      await expect(pasa(e.create, ids.uAdmin)).resolves.toBe(true);
    });

    it('la cuenta IoT con sensores_iot CREATE puede ingerir lecturas', async () => {
      await expect(
        pasa(LecturaSensorController.prototype.ingresar, ids.uIot),
      ).resolves.toBe(true);
    });
  });

  describe('obtenerMisPermisos (GET /auth/me/permisos)', () => {
    it('rol de catálogo', async () => {
      const r = await permisoService.obtenerMisPermisos(ids.uGerenteA);
      expect(r.esSistema).toBe(false);
      expect(r.rolNombre).toBe('Gerente');
      expect(r.permisos.map((x) => x.modulo).sort()).toEqual(
        Object.keys(MAPA_APROBADO)
          .filter((k) => k.startsWith('Gerente|'))
          .map((k) => k.split('|')[1])
          .sort(),
      );
    });

    it('rol personalizado', async () => {
      await expect(
        permisoService.obtenerMisPermisos(ids.uIot),
      ).resolves.toEqual({
        esSistema: false,
        rolNombre: 'Ingesta IoT',
        permisos: [
          {
            modulo: 'sensores_iot',
            canRead: false,
            canCreate: true,
            canUpdate: false,
            canDelete: false,
            canExport: false,
          },
        ],
      });
    });

    it('rol de sistema', async () => {
      await expect(
        permisoService.obtenerMisPermisos(ids.uAdmin),
      ).resolves.toEqual({
        esSistema: true,
        rolNombre: 'Administrador',
        permisos: [],
      });
    });

    it('multi-tenant: el mismo rol de catálogo ve solo la matriz de su empresa', async () => {
      await ds.query(
        `DELETE FROM permiso_modulos WHERE "empresaId" = $1 AND "rolId" = $2 AND modulo = 'configuracion_empresa'`,
        [ids.empresaA, ids.gerente],
      );

      const a = await permisoService.obtenerMisPermisos(ids.uGerenteA);
      const b = await permisoService.obtenerMisPermisos(ids.uGerenteB);

      expect(a.permisos.map((x) => x.modulo)).not.toContain(
        'configuracion_empresa',
      );
      expect(b.permisos.map((x) => x.modulo)).toContain(
        'configuracion_empresa',
      );
      await expect(
        pasa(EmpresaController.prototype.updateIdentidad, ids.uGerenteA),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        pasa(EmpresaController.prototype.updateIdentidad, ids.uGerenteB),
      ).resolves.toBe(true);
    });
  });

  it('empresa nueva: recibe la matriz por defecto completa', async () => {
    const empresaC = await insertar(
      `INSERT INTO empresas (name, cuit) VALUES ('C', '30-3') RETURNING id`,
      [],
    );

    await permisoService.otorgarPermisosPorDefecto(empresaC);
    await permisoService.otorgarPermisosPorDefecto(empresaC); // idempotente

    expect(await matrizCatalogo(empresaC)).toEqual(MAPA_APROBADO);
    const [{ n }] = await ds.query<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM permiso_modulos WHERE "empresaId" = $1 AND modulo = 'gestion_roles'`,
      [empresaC],
    );
    expect(n).toBe(1);
  });

  it('/roles ya no da 500 al otorgar gestion_usuarios y auditoria', async () => {
    const rolService = new RolService(
      ds,
      ds.getRepository(Rol),
      ds.getRepository(PermisoModulo),
    );
    const f = {
      canRead: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canExport: false,
    };

    await rolService.actualizar(
      ids.rolIot,
      ids.empresaA,
      {
        nombre: 'Ingesta IoT',
        permisos: [
          { ...f, modulo: 'sensores_iot', canCreate: true },
          { ...f, modulo: 'gestion_usuarios' },
          { ...f, modulo: 'auditoria' },
        ] as never,
      },
      {
        id: ids.uGerenteA,
        rolId: ids.gerente,
        empresaId: ids.empresaA,
        esSistema: false,
      },
    );

    const modulos = await ds.query<{ m: string }[]>(
      `SELECT modulo::text AS m FROM permiso_modulos WHERE "rolId" = $1 ORDER BY 1`,
      [ids.rolIot],
    );
    expect(modulos.map((x) => x.m)).toEqual([
      'auditoria',
      'gestion_usuarios',
      'sensores_iot',
    ]);
  });

  it('la migración no deja tablas auxiliares', async () => {
    const tablas = await ds.query<{ t: string }[]>(
      `SELECT table_name AS t FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name LIKE 'permiso_modulos%'`,
    );
    expect(tablas.map((x) => x.t)).toEqual(['permiso_modulos']);
  });

  it('down() de la matriz deja sin filas a los roles de catálogo y no toca el resto', async () => {
    const otras = () =>
      ds.query<{ n: number }[]>(
        `SELECT count(*)::int AS n FROM permiso_modulos p JOIN roles r ON r.id = p."rolId"
          WHERE r."empresaId" IS NOT NULL OR r."esSistema"`,
      );
    const [{ n: antes }] = await otras();

    await ds.undoLastMigration();

    const [{ n: catalogo }] = await ds.query<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM permiso_modulos p JOIN roles r ON r.id = p."rolId"
        WHERE r."empresaId" IS NULL AND NOT r."esSistema"`,
    );
    expect(catalogo).toBe(0);
    const [{ n: despues }] = await otras();
    expect(despues).toBe(antes);
    expect(antes).toBeGreaterThan(0); // el rol personalizado de la empresa A
  });
});
