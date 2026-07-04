import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { IS_PUBLIC_KEY } from '../../module/auth/decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

function buildContext(user?: { rolNombre?: string }) {
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

  function mockMetadata(
    isPublic: boolean | undefined,
    roles: string[] | undefined,
  ) {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return isPublic;
      if (key === ROLES_KEY) return roles;
      return undefined;
    });
  }

  it('permite acceso cuando no hay @Roles()', () => {
    mockMetadata(undefined, undefined);

    expect(guard.canActivate(buildContext({ rolNombre: 'Gerente' }))).toBe(
      true,
    );
  });

  it('permite acceso si es @Public()', () => {
    mockMetadata(true, ['Administrador']);

    expect(guard.canActivate(buildContext(undefined))).toBe(true);
  });

  it('permite acceso si el rol coincide', () => {
    mockMetadata(undefined, ['Administrador']);

    expect(
      guard.canActivate(buildContext({ rolNombre: 'Administrador' })),
    ).toBe(true);
  });

  it('lanza ForbiddenException si el rol no coincide', () => {
    mockMetadata(undefined, ['Administrador']);

    expect(() =>
      guard.canActivate(buildContext({ rolNombre: 'Gerente' })),
    ).toThrow(ForbiddenException);
  });

  it('lanza ForbiddenException si no hay usuario', () => {
    mockMetadata(undefined, ['Administrador']);

    expect(() =>
      guard.canActivate(buildContext(undefined)),
    ).toThrow(ForbiddenException);
  });
});