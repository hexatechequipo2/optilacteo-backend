import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import { AuditInterceptor } from '../interceptor/audit-log.interceptor';
import type { AuditLogService } from '../audit-log.service';
import { registrarCambiosAuditoria } from '../decorators/audit-log.decorator';
import { TipoAccion } from '../enums/tipo-accion.enum';

/** HU-72 criterio 5: empresa afectada y diff antes/después en el log. */
describe('AuditInterceptor — empresa objetivo y cambios', () => {
  const record = jest.fn();
  const interceptor = new AuditInterceptor(
    {
      getAllAndOverride: () => ({
        accion: 'ROL_ASIGNAR',
        entidad: 'Usuario',
        tipo: TipoAccion.CONFIGURACION,
      }),
    } as unknown as Reflector,
    { record } as unknown as AuditLogService,
  );
  const flush = () => new Promise((r) => setImmediate(r));
  const ctx = (req: object) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => req }),
    }) as unknown as ExecutionContext;

  beforeEach(() => record.mockReset().mockResolvedValue(undefined));

  it('el Administrador (sin empresa) registra la empresa sobre la que operó, con actor y cambios', async () => {
    const req = {
      user: {
        sub: 1,
        email: 'admin@x.com',
        rolNombre: 'Administrador',
        empresaId: null,
      },
      params: {},
      body: {},
      query: { empresaId: '2' },
      empresaObjetivoId: 2,
    };
    registrarCambiosAuditoria(req, {
      antes: { rolId: 3 },
      despues: { rolId: 4 },
    });
    const next: CallHandler = { handle: () => of({ usuarioId: 9 }) };

    await lastValueFrom(interceptor.intercept(ctx(req), next));
    await flush();

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        userEmail: 'admin@x.com',
        userRol: 'Administrador',
        empresaId: 2,
        accion: 'ROL_ASIGNAR_SUCCESS',
        detalle: {
          status: 'SUCCESS',
          data: { usuarioId: 9 },
          cambios: { antes: { rolId: 3 }, despues: { rolId: 4 } },
        },
      }),
    );
  });

  it('sin empresa objetivo usa la del usuario y no agrega cambios', async () => {
    const req = {
      user: { sub: 5, email: 'g@x.com', rolNombre: 'Gerente', empresaId: 1 },
      params: {},
      body: {},
      query: {},
    };
    const next: CallHandler = { handle: () => of({ ok: true }) };

    await lastValueFrom(interceptor.intercept(ctx(req), next));
    await flush();

    const [registro] = record.mock.calls[0] as [Record<string, unknown>];
    expect(registro.empresaId).toBe(1);
    expect(registro.detalle).toEqual({ status: 'SUCCESS', data: { ok: true } });
  });

  it('en un fallo no registra cambios', async () => {
    const req = {
      user: { sub: 1, email: 'admin@x.com', empresaId: null },
      params: {},
      body: {},
      query: {},
      empresaObjetivoId: 2,
    };
    registrarCambiosAuditoria(req, { antes: 1, despues: 2 });
    const next: CallHandler = {
      handle: () => throwError(() => new Error('falló')),
    };

    await expect(
      lastValueFrom(interceptor.intercept(ctx(req), next)),
    ).rejects.toThrow('falló');
    await flush();

    const [registro] = record.mock.calls[0] as [Record<string, unknown>];
    expect(registro.empresaId).toBe(2);
    expect(registro.detalle).toEqual({
      status: 'FAILURE',
      data: { message: 'falló' },
    });
  });
});
