import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError, lastValueFrom } from 'rxjs';
import { AuditInterceptor } from '../interceptor/audit-log.interceptor';
import { AuditLogService } from '../audit-log.service';
import { AUDIT_KEY } from '../decorators/audit-log.decorator';

const mockAuditLogService = {
  record: jest.fn(),
};

const mockReflector = {
  getAllAndOverride: jest.fn(),
};

function buildExecutionContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

// Helper para esperar a que se resuelvan las promesas "fire and forget"
// disparadas dentro del tap/catchError del interceptor.
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;

  beforeEach(() => {
    interceptor = new AuditInterceptor(
      mockReflector as unknown as Reflector,
      mockAuditLogService as unknown as AuditLogService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('cuando no hay metadata de auditoria, deberia pasar directo al siguiente handler sin registrar nada', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const context = buildExecutionContext({});
    const next: CallHandler = { handle: () => of({ id: 1 }) };

    const result = await lastValueFrom(interceptor.intercept(context, next));

    expect(result).toEqual({ id: 1 });
    expect(mockAuditLogService.record).not.toHaveBeenCalled();
  });

  it('en un flujo exitoso, deberia registrar la auditoria con status SUCCESS usando los datos del usuario autenticado', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      accion: 'PROVEEDOR_ELIMINAR',
      entidad: 'Proveedor',
    });
    const request = {
      user: { sub: 7, email: 'gerente@lacteo.com', empresaId: 2 },
      params: { id: '10' },
      body: {},
    };
    const context = buildExecutionContext(request);
    const next: CallHandler = { handle: () => of({ id: 10, ok: true }) };

    await lastValueFrom(interceptor.intercept(context, next));
    await flushPromises();

    expect(mockAuditLogService.record).toHaveBeenCalledWith({
      userId: 7,
      userEmail: 'gerente@lacteo.com',
      empresaId: 2,
      accion: 'PROVEEDOR_ELIMINAR_SUCCESS',
      entidad: 'Proveedor',
      entidadId: 10,
      detalle: { status: 'SUCCESS', data: { id: 10, ok: true } },
    });
  });

  it('cuando no hay usuario autenticado, deberia usar el email del body y null para userId/empresaId', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      accion: 'LOGIN',
      entidad: 'Usuario',
    });
    const request = {
      params: {},
      body: { email: 'anonimo@lacteo.com' },
    };
    const context = buildExecutionContext(request);
    const next: CallHandler = { handle: () => of({ access_token: 'abc' }) };

    await lastValueFrom(interceptor.intercept(context, next));
    await flushPromises();

    expect(mockAuditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        userEmail: 'anonimo@lacteo.com',
        empresaId: null,
      }),
    );
  });

  it('cuando no hay usuario ni email en el body, deberia usar "anonymous" como userEmail', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      accion: 'ACCION',
      entidad: 'Entidad',
    });
    const request = { params: {}, body: {} };
    const context = buildExecutionContext(request);
    const next: CallHandler = { handle: () => of({}) };

    await lastValueFrom(interceptor.intercept(context, next));
    await flushPromises();

    expect(mockAuditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ userEmail: 'anonymous' }),
    );
  });

  it('deberia resolver entidadId desde params.id cuando es un numero valido', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      accion: 'ACCION',
      entidad: 'Entidad',
    });
    const request = { params: { id: '42' }, body: {} };
    const context = buildExecutionContext(request);
    const next: CallHandler = { handle: () => of({}) };

    await lastValueFrom(interceptor.intercept(context, next));
    await flushPromises();

    expect(mockAuditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ entidadId: 42 }),
    );
  });

  it('deberia resolver entidadId desde el id del response body cuando no hay params.id', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      accion: 'ACCION',
      entidad: 'Entidad',
    });
    const request = { params: {}, body: {} };
    const context = buildExecutionContext(request);
    const next: CallHandler = { handle: () => of({ id: 99 }) };

    await lastValueFrom(interceptor.intercept(context, next));
    await flushPromises();

    expect(mockAuditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ entidadId: 99 }),
    );
  });

  it('deberia devolver entidadId null cuando no hay params.id ni id en el response body', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      accion: 'ACCION',
      entidad: 'Entidad',
    });
    const request = { params: {}, body: {} };
    const context = buildExecutionContext(request);
    const next: CallHandler = { handle: () => of('respuesta-sin-id') };

    await lastValueFrom(interceptor.intercept(context, next));
    await flushPromises();

    expect(mockAuditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ entidadId: null }),
    );
  });

  it('cuando el handler falla, deberia registrar la auditoria con status FAILURE y repropagar el error', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      accion: 'PROVEEDOR_ELIMINAR',
      entidad: 'Proveedor',
    });
    const request = {
      user: { sub: 7, email: 'gerente@lacteo.com', empresaId: 2 },
      params: { id: '5' },
      body: {},
    };
    const context = buildExecutionContext(request);
    const error = new Error('No se pudo eliminar');
    const next: CallHandler = { handle: () => throwError(() => error) };

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).rejects.toThrow('No se pudo eliminar');
    await flushPromises();

    expect(mockAuditLogService.record).toHaveBeenCalledWith({
      userId: 7,
      userEmail: 'gerente@lacteo.com',
      empresaId: 2,
      accion: 'PROVEEDOR_ELIMINAR_FAILURE',
      entidad: 'Proveedor',
      entidadId: 5,
      detalle: { status: 'FAILURE', data: { message: 'No se pudo eliminar' } },
    });
  });

  it('si el registro de auditoria falla, no deberia romper el flujo principal', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      accion: 'ACCION',
      entidad: 'Entidad',
    });
    mockAuditLogService.record.mockRejectedValue(new Error('fallo interno'));
    const request = { params: {}, body: {} };
    const context = buildExecutionContext(request);
    const next: CallHandler = { handle: () => of({ ok: true }) };

    const result = await lastValueFrom(interceptor.intercept(context, next));
    await flushPromises();

    expect(result).toEqual({ ok: true });
  });
});
