import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import {
  AuthenticatedOnly,
  Permissions,
} from '../decorators/permissions.decorator';
import { Public } from '../../module/auth/decorators/public.decorator';
import { PermissionAction } from '../enums/permission-action.enum';
import { ModuloSistema } from '../../module/empresa/enums/modulo-sistema.enum';
import { ModuloAdministrativo } from '../../module/permiso/enums/modulo-administrativo.enum';
import type {
  AccesoUsuario,
  PermisoService,
} from '../../module/permiso/permiso.service';

class Rutas {
  sinDecorar() {}

  @Public()
  publica() {}

  @AuthenticatedOnly()
  autenticada() {}

  @Permissions(ModuloSistema.SENSORES_IOT, PermissionAction.CREATE)
  crearSensor() {}

  @Permissions(
    [ModuloSistema.DASHBOARD, ModuloSistema.MONITOREO_ALERTAS],
    PermissionAction.READ,
  )
  verTablero() {}

  @Permissions(ModuloAdministrativo.PLATAFORMA, PermissionAction.UPDATE)
  plataforma() {}
}

function contexto(handler: keyof Rutas, request: Record<string, unknown>) {
  return {
    getHandler: () => Rutas.prototype[handler],
    getClass: () => Rutas,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function acceso(over: Partial<AccesoUsuario> = {}): AccesoUsuario {
  return {
    userId: 7,
    rolId: 3,
    rolNombre: 'Operario de línea',
    empresaId: 1,
    esSistema: false,
    permisos: [],
    ...over,
  };
}

const permiso = (modulo: string, flags: Record<string, boolean>) =>
  ({ modulo, ...flags }) as unknown as AccesoUsuario['permisos'][number];

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let obtenerAcceso: jest.Mock;

  beforeEach(() => {
    obtenerAcceso = jest.fn();
    guard = new PermissionsGuard(new Reflector(), {
      obtenerAcceso,
    } as unknown as PermisoService);
  });

  describe('default-deny', () => {
    it('rechaza un handler sin decorator aunque el usuario sea de sistema, sin consultar la BD', async () => {
      obtenerAcceso.mockResolvedValue(acceso({ esSistema: true }));

      await expect(
        guard.canActivate(contexto('sinDecorar', { user: { sub: 1 } })),
      ).rejects.toThrow('Recurso sin permiso configurado.');
      expect(obtenerAcceso).not.toHaveBeenCalled();
    });
  });

  describe('@Public y @AuthenticatedOnly', () => {
    it('@Public pasa sin usuario', async () => {
      await expect(guard.canActivate(contexto('publica', {}))).resolves.toBe(
        true,
      );
      expect(obtenerAcceso).not.toHaveBeenCalled();
    });

    it('@AuthenticatedOnly pasa con cualquier rol, sin consultar permisos', async () => {
      await expect(
        guard.canActivate(contexto('autenticada', { user: { sub: 7 } })),
      ).resolves.toBe(true);
      expect(obtenerAcceso).not.toHaveBeenCalled();
    });
  });

  describe('bypass de esSistema', () => {
    it('el rol de sistema pasa sin tener filas de permiso, incluso en PLATAFORMA', async () => {
      obtenerAcceso.mockResolvedValue(
        acceso({ esSistema: true, permisos: [] }),
      );

      await expect(
        guard.canActivate(contexto('plataforma', { user: { sub: 1 } })),
      ).resolves.toBe(true);
    });

    it('un rol no de sistema no pasa PLATAFORMA', async () => {
      obtenerAcceso.mockResolvedValue(
        acceso({
          permisos: [
            permiso(ModuloAdministrativo.GESTION_ROLES, { canUpdate: true }),
          ],
        }),
      );

      await expect(
        guard.canActivate(contexto('plataforma', { user: { sub: 7 } })),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('@Permissions', () => {
    it('pasa con la acción pedida en el módulo y deja el acceso en request.acceso', async () => {
      const a = acceso({
        permisos: [permiso(ModuloSistema.SENSORES_IOT, { canCreate: true })],
      });
      obtenerAcceso.mockResolvedValue(a);
      const request: Record<string, unknown> = { user: { sub: 7 } };

      await expect(
        guard.canActivate(contexto('crearSensor', request)),
      ).resolves.toBe(true);
      expect(obtenerAcceso).toHaveBeenCalledWith(7);
      expect(request.acceso).toBe(a);
    });

    it('rechaza si tiene el módulo pero no la acción', async () => {
      obtenerAcceso.mockResolvedValue(
        acceso({
          permisos: [permiso(ModuloSistema.SENSORES_IOT, { canRead: true })],
        }),
      );

      await expect(
        guard.canActivate(contexto('crearSensor', { user: { sub: 7 } })),
      ).rejects.toThrow('No tiene permiso canCreate en: sensores_iot.');
    });

    it('con varios módulos alcanza con uno', async () => {
      obtenerAcceso.mockResolvedValue(
        acceso({
          permisos: [
            permiso(ModuloSistema.MONITOREO_ALERTAS, { canRead: true }),
          ],
        }),
      );

      await expect(
        guard.canActivate(contexto('verTablero', { user: { sub: 7 } })),
      ).resolves.toBe(true);
    });

    it('rechaza si el usuario no tiene rol activo', async () => {
      obtenerAcceso.mockResolvedValue(null);

      await expect(
        guard.canActivate(contexto('crearSensor', { user: { sub: 7 } })),
      ).rejects.toThrow('El usuario no tiene un rol activo asignado.');
    });

    it('rechaza si no hay usuario identificado', async () => {
      await expect(
        guard.canActivate(contexto('crearSensor', {})),
      ).rejects.toThrow('Usuario no identificado.');
    });
  });
});
