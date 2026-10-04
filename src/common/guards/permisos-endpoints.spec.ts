import {
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  INestApplication,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PermissionsGuard } from './permissions.guard';
import { PermissionAction } from '../enums/permission-action.enum';
import { IS_PUBLIC_KEY } from '../../module/auth/decorators/public.decorator';
import { AuthController } from '../../module/auth/auth.controller';
import { AuthService } from '../../module/auth/auth.service';
import { NotificacionesController } from '../../module/notificaciones/notificaciones.controller';
import { NotificacionesService } from '../../module/notificaciones/notificaciones.service';
import { ConfiguracionAlertaDesconexionService } from '../../module/notificaciones/configuracion-alerta-desconexion.service';
import { SystemConfigController } from '../../module/system-config/system-config.controller';
import { SystemConfigService } from '../../module/system-config/system-config.service';
import { EmpresaController } from '../../module/empresa/empresa.controller';
import { PlanesController } from '../../module/empresa/planes.controller';
import { EmpresaService } from '../../module/empresa/empresa.service';
import { UserController } from '../../module/user/user.controller';
import { UserService } from '../../module/user/user.service';
import { LecturaSensorController } from '../../module/lectura-sensor/lectura-sensor.controller';
import { LecturaSensorService } from '../../module/lectura-sensor/lectura-sensor.service';
import { PermisoService } from '../../module/permiso/permiso.service';
import type { AccesoUsuario } from '../../module/permiso/permiso.service';
import type { PermisoModulo } from '../../module/permiso/entities/permiso-modulo.entity';
import { ModuloAdministrativo } from '../../module/permiso/enums/modulo-administrativo.enum';
import type { ModuloPermiso } from '../../module/permiso/enums/modulo-administrativo.enum';
import { ModuloSistema } from '../../module/empresa/enums/modulo-sistema.enum';

/**
 * HU-72: endpoints que tras el default-deny quedaron sin decorar. Levanta los
 * controllers reales con el PermissionsGuard real como APP_GUARD; solo se
 * mockean los services y la lectura de BD de obtenerAcceso.
 */

const { READ, CREATE, UPDATE, DELETE } = PermissionAction;
const { GESTION_ROLES, GESTION_USUARIOS, CONFIGURACION_EMPRESA, PLATAFORMA } =
  ModuloAdministrativo;

const flags = (modulo: ModuloPermiso, ...acciones: PermissionAction[]) =>
  ({
    modulo,
    canRead: acciones.includes(READ),
    canCreate: acciones.includes(CREATE),
    canUpdate: acciones.includes(UPDATE),
    canDelete: acciones.includes(DELETE),
    canExport: false,
  }) as PermisoModulo;

type Perfil = 'admin' | 'gerente' | 'calidad' | 'operario' | 'iot';

// Perfiles tal como quedan en la BD después del backfill de HU-72.
const PERFILES: Record<Perfil, AccesoUsuario> = {
  admin: {
    userId: 1,
    rolId: 1,
    rolNombre: 'Administrador',
    empresaId: null,
    esSistema: true,
    permisos: [],
  },
  gerente: {
    userId: 2,
    rolId: 2,
    rolNombre: 'Gerente',
    empresaId: 1,
    esSistema: false,
    permisos: [
      flags(GESTION_ROLES, READ, CREATE, UPDATE, DELETE),
      flags(GESTION_USUARIOS, READ, CREATE, UPDATE),
      flags(CONFIGURACION_EMPRESA, READ, UPDATE),
    ],
  },
  calidad: {
    userId: 3,
    rolId: 5,
    rolNombre: 'Responsable de calidad',
    empresaId: 1,
    esSistema: false,
    permisos: [
      flags(GESTION_USUARIOS, READ),
      flags(ModuloSistema.SENSORES_IOT, READ),
    ],
  },
  operario: {
    userId: 4,
    rolId: 3,
    rolNombre: 'Operario de línea',
    empresaId: 1,
    esSistema: false,
    permisos: [flags(ModuloSistema.MONITOREO_ALERTAS, READ)],
  },
  // Rol personalizado de una cuenta de servicio IoT: solo ingesta.
  iot: {
    userId: 5,
    rolId: 40,
    rolNombre: 'Ingesta IoT',
    empresaId: 1,
    esSistema: false,
    permisos: [flags(ModuloSistema.SENSORES_IOT, CREATE)],
  },
};
const ID_A_PERFIL = new Map(
  Object.values(PERFILES).map((a) => [a.userId, a] as const),
);

/** Reemplaza al JwtAuthGuard: el header x-test-user dice quién llama. */
@Injectable()
class FakeJwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const handler = ctx.getHandler();
    if (Reflect.getMetadata(IS_PUBLIC_KEY, handler)) return true;
    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, string>;
      user?: unknown;
      accessToken?: string;
    }>();
    const perfil = PERFILES[req.headers['x-test-user'] as Perfil];
    if (!perfil) throw new UnauthorizedException();
    // El JWT trae datos viejos a propósito: el guard debe leer la BD.
    req.user = { sub: perfil.userId, empresaId: 999, rolNombre: 'del-jwt' };
    req.accessToken = 'token';
    return true;
  }
}

@Controller('sin-decorar')
class SinDecorarController {
  @Get()
  get() {
    return 'no debería llegar';
  }
}

/** Mock genérico: cualquier método resuelve {}. */
const servicioMock = () =>
  new Proxy(
    {},
    {
      get: (target: Record<string, unknown>, prop: string) => {
        if (prop === 'then' || prop.startsWith('on')) return undefined;
        target[prop] ??= jest.fn().mockResolvedValue({});
        return target[prop];
      },
    },
  );

type Metodo = 'get' | 'post' | 'patch' | 'delete';
type Requisito = 'autenticado' | [ModuloPermiso, PermissionAction];

const ENDPOINTS: [Metodo, string, Requisito, Perfil[], Perfil[]][] = [
  // [método, ruta, requisito, perfiles que pasan, perfiles con 403]
  [
    'post',
    '/logout',
    'autenticado',
    ['admin', 'gerente', 'operario', 'iot'],
    [],
  ],
  [
    'get',
    '/notificaciones',
    'autenticado',
    ['admin', 'gerente', 'operario', 'iot'],
    [],
  ],
  [
    'patch',
    '/notificaciones/1/leida',
    'autenticado',
    ['gerente', 'operario'],
    [],
  ],
  [
    'get',
    '/notificaciones/no-leidas/count',
    'autenticado',
    ['gerente', 'operario'],
    [],
  ],
  [
    'get',
    '/system-config/inactivity-timeout',
    'autenticado',
    ['admin', 'operario', 'iot'],
    [],
  ],
  ['get', '/empresa/me', 'autenticado', ['gerente', 'operario', 'iot'], []],
  [
    'get',
    '/auth/me/permisos',
    'autenticado',
    ['admin', 'gerente', 'operario', 'iot'],
    [],
  ],

  [
    'patch',
    '/empresa/me/identidad',
    [CONFIGURACION_EMPRESA, UPDATE],
    ['gerente', 'admin'],
    ['calidad', 'operario', 'iot'],
  ],
  [
    'post',
    '/empresa/me/logo',
    [CONFIGURACION_EMPRESA, UPDATE],
    ['gerente', 'admin'],
    ['calidad', 'operario'],
  ],
  [
    'delete',
    '/empresa/me/logo',
    [CONFIGURACION_EMPRESA, UPDATE],
    ['gerente', 'admin'],
    ['calidad', 'operario'],
  ],

  [
    'post',
    '/empresa',
    [PLATAFORMA, CREATE],
    ['admin'],
    ['gerente', 'calidad', 'operario'],
  ],
  ['get', '/empresa', [PLATAFORMA, READ], ['admin'], ['gerente', 'operario']],
  ['get', '/empresa/1', [PLATAFORMA, READ], ['admin'], ['gerente']],
  ['patch', '/empresa/1', [PLATAFORMA, UPDATE], ['admin'], ['gerente']],
  ['patch', '/empresa/1/activar', [PLATAFORMA, UPDATE], ['admin'], ['gerente']],
  [
    'patch',
    '/empresa/1/desactivar',
    [PLATAFORMA, UPDATE],
    ['admin'],
    ['gerente'],
  ],
  [
    'patch',
    '/empresa/1/modulos/activar',
    [PLATAFORMA, UPDATE],
    ['admin'],
    ['gerente'],
  ],
  [
    'patch',
    '/empresa/1/modulos/desactivar',
    [PLATAFORMA, UPDATE],
    ['admin'],
    ['gerente'],
  ],
  ['delete', '/empresa/1', [PLATAFORMA, DELETE], ['admin'], ['gerente']],
  ['get', '/planes', [PLATAFORMA, READ], ['admin'], ['gerente', 'operario']],
  [
    'patch',
    '/system-config/inactivity-timeout',
    [PLATAFORMA, UPDATE],
    ['admin'],
    ['gerente', 'operario'],
  ],

  [
    'post',
    '/user',
    [GESTION_USUARIOS, CREATE],
    ['gerente', 'admin'],
    ['calidad', 'operario'],
  ],
  [
    'get',
    '/user',
    [GESTION_USUARIOS, READ],
    ['gerente', 'calidad', 'admin'],
    ['operario', 'iot'],
  ],
  [
    'get',
    '/user/9',
    [GESTION_USUARIOS, READ],
    ['gerente', 'calidad', 'admin'],
    ['operario'],
  ],
  [
    'patch',
    '/user/9',
    [GESTION_USUARIOS, UPDATE],
    ['gerente', 'admin'],
    ['calidad', 'operario'],
  ],
  [
    'patch',
    '/user/9/activar',
    [GESTION_USUARIOS, UPDATE],
    ['gerente', 'admin'],
    ['calidad'],
  ],
  [
    'patch',
    '/user/9/desactivar',
    [GESTION_USUARIOS, UPDATE],
    ['gerente', 'admin'],
    ['calidad'],
  ],
  [
    'patch',
    '/user/9/desbloquear',
    [GESTION_USUARIOS, UPDATE],
    ['gerente', 'admin'],
    ['calidad'],
  ],

  [
    'post',
    '/sensores/lecturas',
    [ModuloSistema.SENSORES_IOT, CREATE],
    ['iot', 'admin'],
    ['calidad', 'gerente', 'operario'],
  ],
];

describe('Permisos de los endpoints que el default-deny dejó en 403 (HU-72)', () => {
  let app: INestApplication;
  let obtenerAcceso: jest.SpyInstance;

  beforeAll(async () => {
    // PermisoService real (mapeo de /auth/me/permisos incluido); solo se
    // reemplaza la lectura de BD.
    const permisoService = new PermisoService(
      {} as never,
      {} as never,
      {} as never,
    );
    obtenerAcceso = jest
      .spyOn(permisoService, 'obtenerAcceso')
      .mockImplementation((id: number) =>
        Promise.resolve(ID_A_PERFIL.get(id) ?? null),
      );

    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }])],
      controllers: [
        AuthController,
        NotificacionesController,
        SystemConfigController,
        EmpresaController,
        PlanesController,
        UserController,
        LecturaSensorController,
        SinDecorarController,
      ],
      providers: [
        ...[
          AuthService,
          NotificacionesService,
          ConfiguracionAlertaDesconexionService,
          SystemConfigService,
          EmpresaService,
          UserService,
          LecturaSensorService,
        ].map((provide) => ({ provide, useValue: servicioMock() })),
        { provide: PermisoService, useValue: permisoService },
        { provide: APP_GUARD, useClass: FakeJwtGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    // Un solo listen para todo el archivo: si supertest abre un server efímero
    // por request, bajo la suite completa un puerto reciclado puede caer en
    // el server de otro worker (404 intermitentes).
    await app.listen(0);
  });

  afterAll(() => app.close());
  beforeEach(() => obtenerAcceso.mockClear());

  const llamar = (metodo: Metodo, ruta: string, perfil?: Perfil) => {
    const req = request(app.getHttpServer() as App)[metodo](ruta);
    return perfil ? req.set('x-test-user', perfil) : req;
  };

  describe.each(ENDPOINTS)(
    '%s %s',
    (metodo, ruta, requisito, pasan, rechazados) => {
      it.each(pasan)('%s no recibe 403', async (perfil) => {
        const res = await llamar(metodo, ruta, perfil);
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      });

      if (rechazados.length) {
        it.each(rechazados)('%s recibe 403', async (perfil) => {
          const res = await llamar(metodo, ruta, perfil);
          expect(res.status).toBe(403);
          const [modulo, accion] = requisito as [string, string];
          expect((res.body as { message: string }).message).toBe(
            `No tiene permiso ${accion} en: ${modulo}.`,
          );
        });
      }

      if (requisito === 'autenticado' && ruta !== '/auth/me/permisos') {
        it('no consulta la matriz de permisos', async () => {
          await llamar(metodo, ruta, pasan[0]);
          expect(obtenerAcceso).not.toHaveBeenCalled();
        });
      }

      it('sin token responde 401', async () => {
        expect((await llamar(metodo, ruta)).status).toBe(401);
      });
    },
  );

  it('el default-deny se mantiene: un handler sin decorator da 403 incluso al Administrador', async () => {
    const res = await llamar('get', '/sin-decorar', 'admin');
    expect(res.status).toBe(403);
    expect((res.body as { message: string }).message).toBe(
      'Recurso sin permiso configurado.',
    );
  });

  describe('GET /auth/me/permisos', () => {
    it('rol de catálogo: devuelve rol y permisos leídos de la BD, no del JWT', async () => {
      const res = await llamar('get', '/auth/me/permisos', 'gerente');

      expect(res.status).toBe(200);
      expect(obtenerAcceso).toHaveBeenCalledWith(PERFILES.gerente.userId);
      expect(res.body).toEqual({
        esSistema: false,
        rolNombre: 'Gerente',
        permisos: [
          {
            modulo: 'gestion_roles',
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
            canExport: false,
          },
          {
            modulo: 'gestion_usuarios',
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: false,
            canExport: false,
          },
          {
            modulo: 'configuracion_empresa',
            canRead: true,
            canCreate: false,
            canUpdate: true,
            canDelete: false,
            canExport: false,
          },
        ],
      });
    });

    it('rol personalizado: devuelve su nombre y solo sus permisos', async () => {
      const res = await llamar('get', '/auth/me/permisos', 'iot');

      expect(res.body).toEqual({
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

    it('rol de sistema: esSistema true y permisos vacío', async () => {
      const res = await llamar('get', '/auth/me/permisos', 'admin');

      expect(res.body).toEqual({
        esSistema: true,
        rolNombre: 'Administrador',
        permisos: [],
      });
    });

    it('usuario sin rol activo: 403', async () => {
      obtenerAcceso.mockResolvedValueOnce(null);

      const res = await llamar('get', '/auth/me/permisos', 'gerente');

      expect(res.status).toBe(403);
    });
  });
});
