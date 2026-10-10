import 'reflect-metadata';
import {
  AUDIT_KEY,
  AUDIT_CAMBIOS_KEY,
  AuditLog,
  AuditMetadata,
  AuditDescripcionContext,
  registrarCambiosAuditoria,
  AuditCambios,
} from '../decorators/audit-log.decorator';
import { TipoAccion } from '../enums/tipo-accion.enum';

describe('AuditLog decorator', () => {
  it('debe exportar la clave de metadatos correcta', () => {
    expect(AUDIT_KEY).toBe('audit_log_metadata');
  });

  it('debe guardar los metadatos de auditoría en el método', () => {
    class TestController {
      @AuditLog('USUARIO_CREAR', 'Usuario', TipoAccion.ALTA)
      crearUsuario() {}
    }

    const metadata: AuditMetadata = Reflect.getMetadata(
      AUDIT_KEY,
      TestController.prototype.crearUsuario,
    );

    expect(metadata).toEqual({
      accion: 'USUARIO_CREAR',
      entidad: 'Usuario',
      tipo: TipoAccion.ALTA,
      descripcion: undefined,
    });
  });

  it('debe guardar una descripción personalizada', () => {
    const descripcion = jest.fn(
      (_ctx: AuditDescripcionContext) => 'Usuario creado correctamente',
    );

    class TestController {
      @AuditLog(
        'USUARIO_CREAR',
        'Usuario',
        TipoAccion.ALTA,
        descripcion,
      )
      crearUsuario() {}
    }

    const metadata: AuditMetadata = Reflect.getMetadata(
      AUDIT_KEY,
      TestController.prototype.crearUsuario,
    );

    expect(metadata.accion).toBe('USUARIO_CREAR');
    expect(metadata.entidad).toBe('Usuario');
    expect(metadata.tipo).toBe(TipoAccion.ALTA);
    expect(metadata.descripcion).toBe(descripcion);

    const contexto = {
      request: {
        params: {},
        body: { nombre: 'Ana' },
        query: {},
      },
      responseBody: { id: 1 },
      status: 'SUCCESS',
    } as AuditDescripcionContext;

    expect(metadata.descripcion?.(contexto)).toBe(
      'Usuario creado correctamente',
    );
  });

  it('debe permitir usar el decorador en distintos métodos', () => {
    class TestController {
      @AuditLog('USUARIO_CREAR', 'Usuario', TipoAccion.ALTA)
      crear() {}

      @AuditLog('USUARIO_ELIMINAR', 'Usuario', TipoAccion.BAJA)
      eliminar() {}
    }

    const metadataCrear = Reflect.getMetadata(
      AUDIT_KEY,
      TestController.prototype.crear,
    );
    const metadataEliminar = Reflect.getMetadata(
      AUDIT_KEY,
      TestController.prototype.eliminar,
    );

    expect(metadataCrear.accion).toBe('USUARIO_CREAR');
    expect(metadataEliminar.accion).toBe('USUARIO_ELIMINAR');
  });
});

describe('registrarCambiosAuditoria', () => {
  it('debe exportar la clave correcta para los cambios', () => {
    expect(AUDIT_CAMBIOS_KEY).toBe('auditCambios');
  });

  it('debe adjuntar los cambios al objeto request', () => {
    const request: Record<string, unknown> = {};
    const cambios: AuditCambios = {
      antes: { nombre: 'Ana' },
      despues: { nombre: 'María' },
    };

    registrarCambiosAuditoria(request, cambios);

    expect(request[AUDIT_CAMBIOS_KEY]).toEqual(cambios);
  });

  it('debe conservar los valores originales de antes y después', () => {
    const request: Record<string, unknown> = {};
    const antes = { estado: 'PENDIENTE', activo: false };
    const despues = { estado: 'APROBADO', activo: true };

    registrarCambiosAuditoria(request, { antes, despues });

    const resultado = request[AUDIT_CAMBIOS_KEY] as AuditCambios;

    expect(resultado.antes).toBe(antes);
    expect(resultado.despues).toBe(despues);
  });

  it('debe reemplazar los cambios previamente registrados', () => {
    const request: Record<string, unknown> = {};

    registrarCambiosAuditoria(request, {
      antes: { valor: 1 },
      despues: { valor: 2 },
    });

    const nuevosCambios: AuditCambios = {
      antes: { valor: 2 },
      despues: { valor: 3 },
    };

    registrarCambiosAuditoria(request, nuevosCambios);

    expect(request[AUDIT_CAMBIOS_KEY]).toEqual(nuevosCambios);
  });

  it('debe funcionar con un objeto request que ya contiene propiedades', () => {
    const request: Record<string, unknown> = {
      method: 'PATCH',
      params: { id: '10' },
    };

    const cambios: AuditCambios = {
      antes: { precio: 100 },
      despues: { precio: 150 },
    };

    registrarCambiosAuditoria(request, cambios);

    expect(request.method).toBe('PATCH');
    expect(request.params).toEqual({ id: '10' });
    expect(request[AUDIT_CAMBIOS_KEY]).toEqual(cambios);
  });
});
