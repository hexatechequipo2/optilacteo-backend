/**
 * HU-72 contra Postgres real: migraciones desde cero, backfill sobre datos
 * existentes, guard + PermisoService leyendo la BD, y el 500 que daba /roles
 * al otorgar módulos administrativos que no estaban en el enum. Incluye el
 * criterio 5 por HTTP (Administrador operando sobre la empresa A y la B).
 *
 * Requiere el Postgres de docker-compose (usa las credenciales del .env y
 * crea/borra su propia base). Correr con: npm run test:e2e -- permisos-hu72
 */
import 'reflect-metadata';
import { readdirSync } from 'fs';
import { join } from 'path';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  Injectable,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { RolModule } from '../src/module/rol/rol.module';
import { UserModule } from '../src/module/user/user.module';
import { PermisoModule } from '../src/module/permiso/permiso.module';
import { AuditLogModule } from '../src/module/audit/audit-log.module';
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
// supertest tipa res.body como any; los asserts lo validan igual.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

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

  describe('criterio 5: el Administrador gestiona roles y usuarios de una empresa (HTTP)', () => {
    let app: INestApplication;
    let http: App;
    let rolCustomB: number;
    let rolCustomA: number;
    let usuarioNuevoA: number;
    let usuarioNuevoB: number;

    /** Reemplaza al JwtAuthGuard: x-user-id dice quién llama; el resto sale de la BD. */
    @Injectable()
    class FakeJwtGuard implements CanActivate {
      async canActivate(ctx: ExecutionContext) {
        const req = ctx.switchToHttp().getRequest<{
          headers: Record<string, string>;
          user?: unknown;
        }>();
        const id = Number(req.headers['x-user-id']);
        const [u] = await ds.query<
          {
            email: string;
            rolId: number;
            rolNombre: string;
            empresaId: number | null;
          }[]
        >(
          `SELECT u.email, u."rolId", r.nombre AS "rolNombre", u."empresaId"
             FROM users u JOIN roles r ON r.id = u."rolId" WHERE u.id = $1`,
          [id],
        );
        if (!u) throw new UnauthorizedException();
        req.user = { sub: id, ...u };
        return true;
      }
    }

    const como = (userId: number) => ({
      get: (ruta: string) =>
        request(http).get(ruta).set('x-user-id', String(userId)),
      post: (ruta: string, body: object) =>
        request(http).post(ruta).set('x-user-id', String(userId)).send(body),
      put: (ruta: string, body: object) =>
        request(http).put(ruta).set('x-user-id', String(userId)).send(body),
      patch: (ruta: string, body: object) =>
        request(http).patch(ruta).set('x-user-id', String(userId)).send(body),
      delete: (ruta: string) =>
        request(http).delete(ruta).set('x-user-id', String(userId)),
    });
    const admin = () => como(ids.uAdmin);
    const gerenteA = () => como(ids.uGerenteA);

    /** Último registro de auditoría con esa acción (el interceptor escribe en segundo plano). */
    const auditoria = async (accion: string) => {
      for (let i = 0; i < 20; i++) {
        const [fila] = await ds.query<
          {
            userId: number;
            userRol: string;
            empresaId: number | null;
            entidadId: number | null;
            detalle: {
              status: string;
              data: Record<string, unknown>;
              cambios?: { antes: unknown; despues: unknown };
            };
          }[]
        >(
          `SELECT "userId", "userRol", "empresaId", "entidadId", detalle
             FROM audit_log WHERE accion = $1 ORDER BY id DESC LIMIT 1`,
          [accion],
        );
        if (fila) return fila;
        await new Promise((r) => setTimeout(r, 50));
      }
      throw new Error(`Sin registro de auditoría ${accion}`);
    };
    const limpiarAuditoria = () => ds.query(`DELETE FROM audit_log`);

    const sinAcceso = {
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canExport: false,
    };
    const permisosLab = [
      { ...sinAcceso, modulo: 'trazabilidad', canRead: true },
    ];

    beforeAll(async () => {
      // Plan con cupo de usuarios para las altas del bloque.
      await ds.query(
        `UPDATE empresas SET plan = 'enterprise' WHERE id = ANY($1)`,
        [[ids.empresaA, ids.empresaB]],
      );
      // B contrata trazabilidad (el rol propio de B la otorga).
      await ds.query(
        `INSERT INTO empresa_modulos (modulo, "isActive", "empresaId") VALUES ('trazabilidad', true, $1)`,
        [ids.empresaB],
      );
      rolCustomA = await insertar(
        `INSERT INTO roles (nombre, "empresaId") VALUES ('Laboratorio A', $1) RETURNING id`,
        [ids.empresaA],
      );

      const moduleRef = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            ...baseDataSource.options,
            database: DB,
            migrations: [],
          } as Parameters<typeof TypeOrmModule.forRoot>[0]),
          PermisoModule,
          RolModule,
          UserModule,
          AuditLogModule,
        ],
        providers: [
          { provide: APP_GUARD, useClass: FakeJwtGuard },
          { provide: APP_GUARD, useClass: PermissionsGuard },
        ],
      }).compile();
      app = moduleRef.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      app.useGlobalFilters(new AllExceptionsFilter());
      await app.listen(0);
      http = app.getHttpServer() as App;
      await limpiarAuditoria();
    }, 60_000);

    afterAll(async () => {
      await app?.close();
    });

    // El interceptor audita en segundo plano: cada caso empieza sin registros.
    beforeEach(() => limpiarAuditoria());

    describe('empresaId obligatorio y existente para el Administrador', () => {
      it.each([
        ['GET /roles', () => admin().get('/roles')],
        [
          'POST /roles',
          () => admin().post('/roles', { nombre: 'X1', permisos: [] }),
        ],
        [
          'PUT /roles/usuarios/:id',
          () =>
            admin().put(`/roles/usuarios/${ids.uOperarioA}`, {
              rolId: ids.calidad,
            }),
        ],
        [
          'POST /user',
          () =>
            admin().post('/user', {
              name: 'n',
              email: 'n@x.com',
              password: '123456',
              rolId: ids.operario,
            }),
        ],
        [
          'PATCH /user/:id',
          () => admin().patch(`/user/${ids.uOperarioA}`, { name: 'n' }),
        ],
      ])('%s sin empresaId → 400', async (_r, llamar) => {
        const res = await llamar();
        expect(res.status).toBe(400);
        expect(res.body.message).toBe(
          'empresaId es obligatorio para el Administrador.',
        );
      });

      it('empresa inexistente → 404', async () => {
        const res = await admin().get('/roles?empresaId=999999');
        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Empresa no encontrada.');
      });
    });

    describe.each([
      ['A', () => ids.empresaA],
      ['B', () => ids.empresaB],
    ])('Administrador sobre la empresa %s', (letra, empresa) => {
      it('lista roles de catálogo y propios con la matriz de esa empresa', async () => {
        const res = await admin().get(`/roles?empresaId=${empresa()}`);
        expect(res.status).toBe(200);
        const roles = res.body as {
          id: number;
          nombre: string;
          esCatalogo: boolean;
          permisos: { modulo: string }[];
        }[];
        const gerente = roles.find((r) => r.nombre === 'Gerente')!;
        expect(gerente.esCatalogo).toBe(true);
        expect(gerente.permisos.map((p) => p.modulo)).toContain(
          'gestion_roles',
        );
        // Los roles propios de la otra empresa no aparecen.
        const nombres = roles.map((r) => r.nombre);
        expect(nombres.includes('Laboratorio A')).toBe(letra === 'A');
      });

      it('crea un usuario con rol de catálogo y queda auditado con empresa afectada y diff', async () => {
        const res = await admin().post('/user', {
          name: `Nuevo ${letra}`,
          email: `nuevo${letra}@hu72.test`,
          password: '123456',
          rolId: ids.operario,
          empresaId: empresa(),
        });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({
          rolNombre: 'Operario de línea',
          empresa: { id: empresa() },
        });
        if (letra === 'A') usuarioNuevoA = res.body.id;
        else usuarioNuevoB = res.body.id;

        const log = await auditoria('USUARIO_CREAR_SUCCESS');
        expect(log).toMatchObject({
          userId: ids.uAdmin,
          userRol: 'Administrador',
          empresaId: empresa(),
        });
        expect(log.detalle.cambios).toEqual({
          antes: null,
          despues: {
            rolId: ids.operario,
            rolNombre: 'Operario de línea',
            empresaId: empresa(),
          },
        });
      });

      it('cambia el rol con PUT /roles/usuarios y queda auditado', async () => {
        const usuario = letra === 'A' ? usuarioNuevoA : usuarioNuevoB;
        const res = await admin().put(
          `/roles/usuarios/${usuario}?empresaId=${empresa()}`,
          {
            rolId: ids.calidad,
          },
        );
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          usuarioId: usuario,
          rolAnterior: 'Operario de línea',
          rolNuevo: 'Responsable de calidad',
        });

        const log = await auditoria('ROL_ASIGNAR_SUCCESS');
        expect(log).toMatchObject({ userId: ids.uAdmin, empresaId: empresa() });
        expect(log.detalle.data).toMatchObject({
          rolAnterior: 'Operario de línea',
          rolNuevo: 'Responsable de calidad',
        });
      });

      it('PATCH /user/:id edita datos (no el rol) y queda auditado con el diff', async () => {
        const usuario = letra === 'A' ? usuarioNuevoA : usuarioNuevoB;
        const res = await admin().patch(`/user/${usuario}`, {
          name: `Editado ${letra}`,
          empresaId: empresa(),
        });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
          id: usuario,
          name: `Editado ${letra}`,
          rolNombre: 'Responsable de calidad',
        });

        const log = await auditoria('USUARIO_ACTUALIZAR_SUCCESS');
        expect(log).toMatchObject({
          userId: ids.uAdmin,
          empresaId: empresa(),
          entidadId: usuario,
        });
        expect(log.detalle.cambios).toEqual({
          antes: expect.objectContaining({ name: `Nuevo ${letra}` }),
          despues: expect.objectContaining({ name: `Editado ${letra}` }),
        });
      });

      it('PATCH /user/:id con rolId → 400: el rol va por PUT /roles/usuarios', async () => {
        const usuario = letra === 'A' ? usuarioNuevoA : usuarioNuevoB;
        const res = await admin().patch(`/user/${usuario}`, {
          rolId: ids.produccion,
          empresaId: empresa(),
        });
        expect(res.status).toBe(400);
        const [{ rol }] = await ds.query<{ rol: number }[]>(
          `SELECT "rolId" AS rol FROM users WHERE id = $1`,
          [usuario],
        );
        expect(rol).toBe(ids.calidad);
      });
    });

    describe('Administrador: CRUD de roles de una empresa, auditado', () => {
      it('crea, edita la matriz y elimina un rol de la empresa B', async () => {
        const creado = await admin().post(`/roles?empresaId=${ids.empresaB}`, {
          nombre: 'Laboratorio B',
          permisos: permisosLab,
        });
        expect(creado.status).toBe(201);
        rolCustomB = creado.body.id;
        let log = await auditoria('ROL_CREAR_SUCCESS');
        expect(log).toMatchObject({
          userId: ids.uAdmin,
          empresaId: ids.empresaB,
        });
        expect(log.detalle.data.despues).toEqual([
          expect.objectContaining({ modulo: 'trazabilidad', canRead: true }),
        ]);

        const editado = await admin().put(
          `/roles/${rolCustomB}?empresaId=${ids.empresaB}`,
          {
            nombre: 'Laboratorio B',
            permisos: [{ ...permisosLab[0], canUpdate: true }],
          },
        );
        expect(editado.status).toBe(200);
        log = await auditoria('ROL_ACTUALIZAR_SUCCESS');
        expect(log).toMatchObject({
          empresaId: ids.empresaB,
          entidadId: rolCustomB,
        });
        expect(log.detalle.data.antes).toEqual([
          expect.objectContaining({ canUpdate: false }),
        ]);
        expect(log.detalle.data.despues).toEqual([
          expect.objectContaining({ canUpdate: true }),
        ]);
      });

      it('no puede asignar el rol Administrador a un usuario de empresa', async () => {
        const put = await admin().put(
          `/roles/usuarios/${ids.uOperarioA}?empresaId=${ids.empresaA}`,
          {
            rolId: ids.administrador,
          },
        );
        expect(put.status).toBe(403);
        const post = await admin().post('/user', {
          name: 'x',
          email: 'adm@hu72.test',
          password: '123456',
          rolId: ids.administrador,
          empresaId: ids.empresaA,
        });
        expect(post.status).toBe(403);
      });
    });

    describe('usuario y rol de empresas distintas', () => {
      it('PUT /roles/usuarios: usuario de A operando en B → 404', async () => {
        const res = await admin().put(
          `/roles/usuarios/${ids.uOperarioA}?empresaId=${ids.empresaB}`,
          { rolId: ids.calidad },
        );
        expect(res.status).toBe(404);
      });

      it('PUT /roles/usuarios: rol propio de B para un usuario de A → 404', async () => {
        const res = await admin().put(
          `/roles/usuarios/${ids.uOperarioA}?empresaId=${ids.empresaA}`,
          { rolId: rolCustomB },
        );
        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Rol no encontrado.');
      });

      it('POST /user: rol propio de B en la empresa A → 404', async () => {
        const res = await admin().post('/user', {
          name: 'x',
          email: 'cruzado@hu72.test',
          password: '123456',
          rolId: rolCustomB,
          empresaId: ids.empresaA,
        });
        expect(res.status).toBe(404);
      });

      it('PATCH /user: usuario de A con empresaId B → 404', async () => {
        const res = await admin().patch(`/user/${ids.uOperarioA}`, {
          name: 'x',
          empresaId: ids.empresaB,
        });
        expect(res.status).toBe(404);
      });
    });

    describe('Gerente de A no puede leer ni modificar nada de B', () => {
      it('sin empresaId opera sobre la suya', async () => {
        const res = await gerenteA().get('/roles');
        expect(res.status).toBe(200);
        expect(
          (res.body as { nombre: string }[]).map((r) => r.nombre),
        ).toContain('Laboratorio A');
      });

      it.each([
        [
          'GET /roles',
          () => gerenteA().get(`/roles?empresaId=${ids.empresaB}`),
        ],
        [
          'POST /roles',
          () =>
            gerenteA().post(`/roles?empresaId=${ids.empresaB}`, {
              nombre: 'Intruso',
              permisos: [],
            }),
        ],
        [
          'PUT /roles/:id',
          () =>
            gerenteA().put(`/roles/${rolCustomB}?empresaId=${ids.empresaB}`, {
              nombre: 'Laboratorio B',
              permisos: [],
            }),
        ],
        [
          'DELETE /roles/:id',
          () =>
            gerenteA().delete(`/roles/${rolCustomB}?empresaId=${ids.empresaB}`),
        ],
        [
          'PUT /roles/usuarios/:id',
          () =>
            gerenteA().put(
              `/roles/usuarios/${ids.uGerenteB}?empresaId=${ids.empresaB}`,
              { rolId: ids.operario },
            ),
        ],
        [
          'POST /user',
          () =>
            gerenteA().post('/user', {
              name: 'x',
              email: 'intruso@hu72.test',
              password: '123456',
              rolId: ids.operario,
              empresaId: ids.empresaB,
            }),
        ],
        [
          'PATCH /user/:id',
          () =>
            gerenteA().patch(`/user/${ids.uGerenteB}`, {
              name: 'x',
              empresaId: ids.empresaB,
            }),
        ],
      ])('%s con empresaId de B → 403', async (_r, llamar) => {
        const res = await llamar();
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('No podés operar sobre otra empresa.');
      });

      it.each([
        [
          'PUT /roles/:id',
          () =>
            gerenteA().put(`/roles/${rolCustomB}`, {
              nombre: 'Laboratorio B',
              permisos: [],
            }),
        ],
        ['DELETE /roles/:id', () => gerenteA().delete(`/roles/${rolCustomB}`)],
        [
          'PUT /roles/usuarios/:id',
          () =>
            gerenteA().put(`/roles/usuarios/${ids.uGerenteB}`, {
              rolId: ids.operario,
            }),
        ],
        [
          'PATCH /user/:id',
          () => gerenteA().patch(`/user/${ids.uGerenteB}`, { name: 'x' }),
        ],
      ])('%s sobre recursos de B sin empresaId → 404', async (_r, llamar) => {
        const res = await llamar();
        expect(res.status).toBe(404);
      });

      it('nada de B cambió', async () => {
        const [b] = await ds.query<{ nombre: string; rol: string }[]>(
          `SELECT u.name AS nombre, r.nombre AS rol FROM users u JOIN roles r ON r.id = u."rolId" WHERE u.id = $1`,
          [ids.uGerenteB],
        );
        expect(b).toEqual({ nombre: 'gerenteB', rol: 'Gerente' });
        const [{ n }] = await ds.query<{ n: number }[]>(
          `SELECT count(*)::int AS n FROM roles WHERE nombre = 'Intruso'`,
        );
        expect(n).toBe(0);
      });
    });

    describe('protecciones del criterio 4, también para el Administrador', () => {
      it('no se modifica ni elimina el rol Administrador', async () => {
        const put = await admin().put(
          `/roles/${ids.administrador}?empresaId=${ids.empresaA}`,
          {
            nombre: 'Administrador',
            permisos: [],
          },
        );
        expect(put.status).toBe(409);
        const del = await admin().delete(
          `/roles/${ids.administrador}?empresaId=${ids.empresaA}`,
        );
        expect(del.status).toBe(409);
      });

      it('no se elimina un rol con usuarios asignados', async () => {
        await ds.query(`UPDATE users SET "rolId" = $1 WHERE id = $2`, [
          rolCustomA,
          usuarioNuevoA,
        ]);
        const res = await admin().delete(
          `/roles/${rolCustomA}?empresaId=${ids.empresaA}`,
        );
        expect(res.status).toBe(409);
        await ds.query(`UPDATE users SET "rolId" = $1 WHERE id = $2`, [
          ids.produccion,
          usuarioNuevoA,
        ]);
      });

      it('la empresa conserva al menos un gestor de roles activo', async () => {
        // gerenteB es el único gestor de B.
        const put = await admin().put(
          `/roles/usuarios/${ids.uGerenteB}?empresaId=${ids.empresaB}`,
          { rolId: ids.operario },
        );
        expect(put.status).toBe(409);
      });

      it('un gestor no puede quitarse gestion_roles ni asignarse un rol sin gestión', async () => {
        const matriz = await gerenteA().put(`/roles/${ids.gerente}`, {
          nombre: 'Gerente',
          permisos: [],
        });
        expect(matriz.status).toBe(409);
        const asignar = await gerenteA().put(
          `/roles/usuarios/${ids.uGerenteA}`,
          { rolId: ids.operario },
        );
        expect(asignar.status).toBe(409);
      });

      it('el Administrador elimina un rol sin usuarios y queda auditado con lo que tenía', async () => {
        const res = await admin().delete(
          `/roles/${rolCustomB}?empresaId=${ids.empresaB}`,
        );
        expect(res.status).toBe(200);
        const log = await auditoria('ROL_ELIMINAR_SUCCESS');
        expect(log).toMatchObject({
          userId: ids.uAdmin,
          empresaId: ids.empresaB,
          entidadId: rolCustomB,
        });
        expect(log.detalle.data.antes).toEqual([
          expect.objectContaining({ modulo: 'trazabilidad', canUpdate: true }),
        ]);
      });
    });
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
