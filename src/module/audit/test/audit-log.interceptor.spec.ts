import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, lastValueFrom, of, throwError } from 'rxjs';
import { AuditInterceptor } from '../interceptor/audit-log.interceptor';
import { AuditLogService } from '../audit-log.service';
import {
  AUDIT_CAMBIOS_KEY,
  AuditMetadata,
} from '../decorators/audit-log.decorator';
import { TipoAccion } from '../enums/tipo-accion.enum';

const mockAuditLogService = { record: jest.fn() };
const mockReflector = { getAllAndOverride: jest.fn() };

// registerAudit corre "fire and forget": hay que vaciar la cola antes de afirmar.
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

const buildContext = (request: unknown): ExecutionContext =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

const next = (obs: Observable<unknown>): CallHandler => ({ handle: () => obs });

const metaBase = {
  accion: 'LOTE_CREAR',
  entidad: 'Lote',
  tipo: TipoAccion.ALTA,
} as AuditMetadata;

const requestBase = (extra: Record<string, unknown> = {}) =>
  ({
    user: { sub: 1, email: 'u@x.com', rolNombre: 'GERENTE', empresaId: 10 },
    params: { id: '7' },
    body: {},
    query: {},
    ...extra,
  }) as any;

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;

  // Ejecuta con éxito y devuelve el argumento con el que se llamó a record().
  const ejecutarOk = async (
    meta: AuditMetadata,
    request: unknown,
    body: unknown = { id: 1 },
  ) => {
    mockReflector.getAllAndOverride.mockReturnValue(meta);
    await lastValueFrom(
      interceptor.intercept(buildContext(request), next(of(body))),
    );
    await flush();
    return mockAuditLogService.record.mock.calls[0][0];
  };

  // Ejecuta con error del handler y espera a que se registre la auditoría.
  const ejecutarFallo = async (
    meta: AuditMetadata,
    request: unknown,
    error: unknown,
  ) => {
    mockReflector.getAllAndOverride.mockReturnValue(meta);
    await lastValueFrom(
      interceptor.intercept(buildContext(request), next(throwError(() => error))),
    ).catch((e) => e);
    await flush();
  };

  beforeEach(() => {
    jest.resetAllMocks();
    mockAuditLogService.record.mockResolvedValue(undefined);
    interceptor = new AuditInterceptor(
      mockReflector as unknown as Reflector,
      mockAuditLogService as unknown as AuditLogService,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('sin metadata de auditoría, pasa directo al handler sin registrar nada', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    const result = await lastValueFrom(
      interceptor.intercept(buildContext({}), next(of({ id: 1 }))),
    );
    await flush();

    expect(result).toEqual({ id: 1 });
    expect(mockAuditLogService.record).not.toHaveBeenCalled();
  });

  describe('flujo exitoso', () => {
    it('registra SUCCESS con los datos del usuario autenticado', async () => {
      const request = {
        user: { sub: 7, email: 'gerente@lacteo.com', empresaId: 2 },
        params: { id: '10' },
        body: {},
      };

      await ejecutarOk(
        { accion: 'PROVEEDOR_ELIMINAR', entidad: 'Proveedor', tipo: TipoAccion.BAJA } as AuditMetadata,
        request,
        { id: 10, ok: true },
      );

      expect(mockAuditLogService.record).toHaveBeenCalledWith({
        userId: 7,
        userEmail: 'gerente@lacteo.com',
        userNombre: null,
        userRol: null,
        empresaId: 2,
        accion: 'PROVEEDOR_ELIMINAR_SUCCESS',
        entidad: 'Proveedor',
        entidadId: 10,
        tipo: TipoAccion.BAJA,
        descripcion: 'Baja de Proveedor #10',
        detalle: { status: 'SUCCESS', data: { id: 10, ok: true } },
      });
    });

    it('si falla el registro de auditoría, loguea y devuelve igual la respuesta', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      mockAuditLogService.record.mockRejectedValue(new Error('db caída'));
      mockReflector.getAllAndOverride.mockReturnValue(metaBase);

      const res = await lastValueFrom(
        interceptor.intercept(buildContext(requestBase()), next(of({ id: 1 }))),
      );
      await flush();

      expect(res).toEqual({ id: 1 });
      expect(errorSpy).toHaveBeenCalledWith('Fallo auditando éxito: db caída');
    });

    it('incluye "cambios" cuando el request los trae', async () => {
      const cambios = { nombre: { antes: 'a', despues: 'b' } };

      const arg = await ejecutarOk(
        metaBase,
        requestBase({ [AUDIT_CAMBIOS_KEY]: cambios }),
      );

      expect(arg.detalle.cambios).toEqual(cambios);
    });

    it('prioriza empresaObjetivoId sobre la empresa del usuario', async () => {
      const arg = await ejecutarOk(metaBase, requestBase({ empresaObjetivoId: 99 }));

      expect(arg.empresaId).toBe(99);
    });

    it.each([
      ['array', [1, 2]],
      ['null', null],
      ['string', 'texto'],
    ])('no intenta sanear una respuesta de tipo %s', async (_l, body) => {
      const arg = await ejecutarOk(metaBase, requestBase({ params: {} }), body);

      expect(arg.detalle.data).toEqual(body);
    });
  });

  describe('usuario y email', () => {
    it('sin usuario autenticado usa el email del body y null para userId/empresaId', async () => {
      const arg = await ejecutarOk(
        { accion: 'LOGIN', entidad: 'Usuario', tipo: TipoAccion.LOGIN } as AuditMetadata,
        { params: {}, body: { email: 'anonimo@lacteo.com' } },
        { access_token: 'abc' },
      );

      expect(arg).toEqual(
        expect.objectContaining({
          userId: null,
          userEmail: 'anonimo@lacteo.com',
          empresaId: null,
          descripcion: 'Inicio de sesión',
        }),
      );
    });

    it('usa "anonymous" si no hay usuario ni email en el body', async () => {
      const arg = await ejecutarOk(
        metaBase,
        requestBase({ user: undefined, body: undefined }),
      );

      expect(arg.userEmail).toBe('anonymous');
    });

    it('en el LOGIN toma usuario, rol y empresa de la respuesta y no guarda los tokens', async () => {
      const request = requestBase({
        user: undefined,
        params: {},
        body: { email: 'body@x.com' },
      });
      const respuesta = {
        user: {
          id: 3,
          email: 'resp@x.com',
          nombre: 'Ana',
          rolNombre: 'GERENTE',
          empresaId: 9,
        },
        access_token: 'secreto',
        refresh_token: 'secreto2',
        ok: true,
      };

      const arg = await ejecutarOk(
        { ...metaBase, tipo: TipoAccion.LOGIN },
        request,
        respuesta,
      );

      expect(arg).toEqual(
        expect.objectContaining({
          userId: 3,
          userEmail: 'resp@x.com',
          userNombre: 'Ana',
          userRol: 'GERENTE',
          empresaId: 9,
        }),
      );
      expect(arg.detalle.data).not.toHaveProperty('access_token');
      expect(arg.detalle.data).not.toHaveProperty('refresh_token');
      expect(arg.detalle.data).toHaveProperty('ok', true);
    });

    it('en un LOGIN fallido toma el email del body y queda anónimo', async () => {
      await ejecutarFallo(
        { ...metaBase, tipo: TipoAccion.LOGIN },
        requestBase({ user: undefined, params: {}, body: { email: 'body@x.com' } }),
        new Error('credenciales'),
      );

      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          userEmail: 'body@x.com',
          userNombre: null,
          userRol: null,
          empresaId: null,
        }),
      );
    });
  });

  describe('descripción genérica por tipo de acción', () => {
    it.each([
      [TipoAccion.ALTA, 'Alta de Lote #7'],
      [TipoAccion.BAJA, 'Baja de Lote #7'],
      [TipoAccion.EDICION, 'Edición de Lote #7'],
      [TipoAccion.EXPORTACION, 'Exportación de Lote'],
      [TipoAccion.LOGIN, 'Inicio de sesión'],
      [TipoAccion.LOGOUT, 'Cierre de sesión'],
      [TipoAccion.CONFIGURACION, 'Cambio de configuración en Lote #7'],
      [TipoAccion.OTRO, 'Acción sobre Lote #7'],
    ])('%s con id', async (tipo, esperado) => {
      const arg = await ejecutarOk({ ...metaBase, tipo }, requestBase());

      expect(arg.descripcion).toBe(esperado);
    });

    it.each([
      [TipoAccion.ALTA, 'Alta de Lote'],
      [TipoAccion.BAJA, 'Baja de Lote'],
      [TipoAccion.EDICION, 'Edición de Lote'],
      [TipoAccion.CONFIGURACION, 'Cambio de configuración en Lote'],
      [TipoAccion.OTRO, 'Acción sobre Lote'],
    ])('%s sin id', async (tipo, esperado) => {
      const arg = await ejecutarOk({ ...metaBase, tipo }, requestBase({ params: {} }), {});

      expect(arg.descripcion).toBe(esperado);
    });
  });

  describe('descripción custom', () => {
    it('usa la descripción custom cuando existe', async () => {
      const descripcion = jest.fn().mockReturnValue('Descripción propia');

      const arg = await ejecutarOk({ ...metaBase, descripcion }, requestBase());

      expect(arg.descripcion).toBe('Descripción propia');
      expect(descripcion).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'SUCCESS' }),
      );
    });

    it('si lanza un Error, loguea warn y cae a la genérica', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      const descripcion = jest.fn(() => {
        throw new Error('boom');
      });

      const arg = await ejecutarOk({ ...metaBase, descripcion }, requestBase());

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('boom'));
      expect(arg.descripcion).toBe('Alta de Lote #7');
    });

    it('si lanza algo que no es Error, lo convierte con String()', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      const descripcion = jest.fn(() => {
        throw 'texto raro';
      });

      const arg = await ejecutarOk({ ...metaBase, descripcion }, requestBase());

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('texto raro'));
      expect(arg.descripcion).toBe('Alta de Lote #7');
    });
  });

  describe('flujo con error (FAILURE)', () => {
    it('registra FAILURE y relanza el error original', async () => {
      const request = {
        user: { sub: 7, email: 'gerente@lacteo.com', empresaId: 2 },
        params: { id: '5' },
        body: {},
      };
      const meta = {
        accion: 'PROVEEDOR_ELIMINAR',
        entidad: 'Proveedor',
        tipo: TipoAccion.BAJA,
      } as AuditMetadata;
      mockReflector.getAllAndOverride.mockReturnValue(meta);
      const error = new Error('No se pudo eliminar');

      await expect(
        lastValueFrom(
          interceptor.intercept(buildContext(request), next(throwError(() => error))),
        ),
      ).rejects.toBe(error);
      await flush();

      expect(mockAuditLogService.record).toHaveBeenCalledWith({
        userId: 7,
        userEmail: 'gerente@lacteo.com',
        userNombre: null,
        userRol: null,
        empresaId: 2,
        accion: 'PROVEEDOR_ELIMINAR_FAILURE',
        entidad: 'Proveedor',
        entidadId: 5,
        tipo: TipoAccion.BAJA,
        descripcion: 'Baja de Proveedor #5',
        detalle: { status: 'FAILURE', data: { message: 'No se pudo eliminar' } },
      });
    });

    it('si lo lanzado no es un Error, usa "Error desconocido"', async () => {
      await ejecutarFallo(metaBase, requestBase(), 'string suelto');

      expect(mockAuditLogService.record.mock.calls[0][0].detalle.data).toEqual({
        message: 'Error desconocido',
      });
    });

    it('si falla el registro de la auditoría de error, loguea y relanza el error original', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      mockAuditLogService.record.mockRejectedValue(new Error('db caída'));
      mockReflector.getAllAndOverride.mockReturnValue(metaBase);
      const original = new Error('original');

      await expect(
        lastValueFrom(
          interceptor.intercept(
            buildContext(requestBase()),
            next(throwError(() => original)),
          ),
        ),
      ).rejects.toBe(original);
      await flush();

      expect(errorSpy).toHaveBeenCalledWith('Fallo auditando error: db caída');
    });

    it('no incluye "cambios" en el detalle cuando la operación falló', async () => {
      await ejecutarFallo(
        metaBase,
        requestBase({ [AUDIT_CAMBIOS_KEY]: { antes: 1 } }),
        new Error('x'),
      );

      expect(mockAuditLogService.record.mock.calls[0][0].detalle).not.toHaveProperty(
        'cambios',
      );
    });
  });

  describe('resolución del entidadId', () => {
    it('toma params.id cuando es numérico', async () => {
      const arg = await ejecutarOk(metaBase, requestBase({ params: { id: '42' } }), {});

      expect(arg.entidadId).toBe(42);
    });

    it('toma el id de la respuesta cuando no hay params.id', async () => {
      const arg = await ejecutarOk(metaBase, requestBase({ params: {} }), { id: 99 });

      expect(arg.entidadId).toBe(99);
    });

    it('toma body.lote.id cuando no hay params.id ni id en la raíz', async () => {
      const arg = await ejecutarOk(metaBase, requestBase({ params: {} }), {
        lote: { id: 15, nombre: 'Lote A' },
      });

      expect(arg.entidadId).toBe(15);
    });

    it('prioriza params.id sobre body.lote.id', async () => {
      const arg = await ejecutarOk(metaBase, requestBase({ params: { id: '7' } }), {
        lote: { id: 999 },
      });

      expect(arg.entidadId).toBe(7);
    });

    it('si params.id no es numérico, cae al id de la respuesta', async () => {
      const arg = await ejecutarOk(metaBase, requestBase({ params: { id: 'abc' } }), {
        id: 55,
      });

      expect(arg.entidadId).toBe(55);
    });

    it.each([
      ['respuesta sin id', {}],
      ['lote sin id numérico', { lote: { id: 'x' } }],
      ['respuesta no objeto', 'texto'],
    ])('devuelve null con %s', async (_l, body) => {
      const arg = await ejecutarOk(metaBase, requestBase({ params: {} }), body);

      expect(arg.entidadId).toBeNull();
    });
  });
});