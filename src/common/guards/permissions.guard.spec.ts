import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

function buildContext(user?: { rolNombre?: string; permisos?: any }) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: { get: jest.Mock };

  beforeEach(() => {
    reflector = { get: jest.fn() };
    guard = new PermissionsGuard(reflector as unknown as Reflector);
  });

  afterEach(() => jest.clearAllMocks());

  function mockRequired(
    required:
      { modulo: string | string[]; action: 'canRead' | 'canWrite' } | undefined,
  ) {
    reflector.get.mockImplementation((key: string) => {
      if (key === PERMISSIONS_KEY) return required;
      return undefined;
    });
  }

  it('permite el acceso cuando el endpoint no tiene @Permissions()', () => {
    // Arrange
    mockRequired(undefined);

    // Act
    const resultado = guard.canActivate(
      buildContext({ rolNombre: 'Operario', permisos: [] }),
    );

    // Assert
    expect(resultado).toBe(true);
  });

  it('lanza ForbiddenException cuando el usuario no tiene permisos asignados (undefined)', () => {
    // Arrange
    mockRequired({ modulo: 'empresas', action: 'canRead' });

    // Act & Assert
    expect(() =>
      guard.canActivate(
        buildContext({ rolNombre: 'Operario', permisos: undefined }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('lanza ForbiddenException cuando permisos no es un array', () => {
    // Arrange
    mockRequired({ modulo: 'empresas', action: 'canRead' });

    // Act & Assert
    expect(() =>
      guard.canActivate(
        buildContext({
          rolNombre: 'Operario',
          permisos: { modulo: 'empresas', canRead: true } as any,
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('permite el acceso cuando el usuario tiene el permiso requerido sobre un único módulo', () => {
    // Arrange
    mockRequired({ modulo: 'empresas', action: 'canRead' });
    const user = {
      rolNombre: 'Administrador',
      permisos: [{ modulo: 'empresas', canRead: true, canWrite: false }],
    };

    // Act
    const resultado = guard.canActivate(buildContext(user));

    // Assert
    expect(resultado).toBe(true);
  });

  it('lanza ForbiddenException cuando el usuario tiene el módulo pero no la acción requerida', () => {
    // Arrange: tiene canRead pero se exige canWrite
    mockRequired({ modulo: 'empresas', action: 'canWrite' });
    const user = {
      rolNombre: 'Operario',
      permisos: [{ modulo: 'empresas', canRead: true, canWrite: false }],
    };

    // Act & Assert
    expect(() => guard.canActivate(buildContext(user))).toThrow(
      ForbiddenException,
    );
  });

  it('permite el acceso cuando el usuario tiene permiso en al menos uno de varios módulos permitidos', () => {
    // Arrange
    mockRequired({ modulo: ['empresas', 'usuarios'], action: 'canWrite' });
    const user = {
      rolNombre: 'Administrador',
      permisos: [
        { modulo: 'empresas', canRead: true, canWrite: false },
        { modulo: 'usuarios', canRead: true, canWrite: true },
      ],
    };

    // Act
    const resultado = guard.canActivate(buildContext(user));

    // Assert
    expect(resultado).toBe(true);
  });

  it('lanza ForbiddenException con el rol y los módulos involucrados cuando no tiene permiso en ninguno', () => {
    // Arrange
    mockRequired({ modulo: ['empresas', 'usuarios'], action: 'canWrite' });
    const user = {
      rolNombre: 'Operario',
      permisos: [{ modulo: 'alertas', canRead: true, canWrite: true }],
    };

    // Act & Assert
    expect(() => guard.canActivate(buildContext(user))).toThrow(
      'El rol Operario no tiene permiso canWrite en ninguno de los módulos: empresas, usuarios.',
    );
  });
});
