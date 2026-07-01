import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { IS_PUBLIC_KEY } from '../../module/auth/decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../../module/user/enums/role.enum';

function buildContext(user?: { role: Role }): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  function mockMetadata(isPublic: boolean | undefined, roles: Role[] | undefined) {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return isPublic;
      if (key === ROLES_KEY) return roles;
      return undefined;
    });
  }

  it('permite el acceso cuando el endpoint no tiene @Roles()', () => {
    mockMetadata(undefined, undefined);
    expect(guard.canActivate(buildContext({ role: Role.GERENTE }))).toBe(true);
  });

  it('permite el acceso sin importar los roles cuando el endpoint es @Public()', () => {
    // Caso pedido explicitamente: @Public() + @Roles() por error no debe
    // bloquear el endpoint para todo el mundo -- @Public() gana.
    mockMetadata(true, [Role.ADMIN]);
    expect(guard.canActivate(buildContext(undefined))).toBe(true);
  });

  it('permite el acceso cuando el rol del usuario esta en @Roles()', () => {
    mockMetadata(undefined, [Role.ADMIN]);
    expect(guard.canActivate(buildContext({ role: Role.ADMIN }))).toBe(true);
  });

  it('deniega el acceso cuando el rol del usuario no esta en @Roles() (ej. GET /empresa para no-admin)', () => {
    mockMetadata(undefined, [Role.ADMIN]);
    expect(guard.canActivate(buildContext({ role: Role.GERENTE }))).toBe(false);
  });

  it('deniega el acceso (falla cerrado) cuando el endpoint requiere rol y no hay usuario en el request', () => {
    mockMetadata(undefined, [Role.ADMIN]);
    expect(guard.canActivate(buildContext(undefined))).toBe(false);
  });
});
