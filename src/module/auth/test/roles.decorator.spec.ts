import { Reflector } from '@nestjs/core';
import { Roles, ROLES_KEY } from '../decorators/roles.decorator';

describe('Roles Decorator', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  it('debe definir la constante ROLES_KEY con el valor "roles"', () => {
    expect(ROLES_KEY).toBe('roles');
  });

  it('debe adjuntar la metadata de roles a un método', () => {
    class TestController {
      @Roles('ADMIN', 'OPERADOR')
      testMethod() {}
    }

    const roles = reflector.get<string[]>(
      ROLES_KEY,
      TestController.prototype.testMethod,
    );

    expect(roles).toBeDefined();
    expect(roles).toEqual(['ADMIN', 'OPERADOR']);
  });

  it('debe adjuntar la metadata de roles a una clase', () => {
    @Roles('SUPERADMIN')
    class TestController {}

    const roles = reflector.get<string[]>(ROLES_KEY, TestController);

    expect(roles).toBeDefined();
    expect(roles).toEqual(['SUPERADMIN']);
  });

  it('debe permitir un arreglo vacío de roles si no se especifican argumentos', () => {
    class TestController {
      @Roles()
      testMethod() {}
    }

    const roles = reflector.get<string[]>(
      ROLES_KEY,
      TestController.prototype.testMethod,
    );

    expect(roles).toEqual([]);
  });
});