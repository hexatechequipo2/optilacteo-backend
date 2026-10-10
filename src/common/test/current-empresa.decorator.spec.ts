import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentEmpresa } from '../decorators/current-empresa.decorator';

// Extrae la función factory que createParamDecorator registra en la metadata.
function getParamDecoratorFactory(
  decorator: (...args: any[]) => ParameterDecorator,
) {
  class Test {
    handler(@decorator() _param: unknown) {}
  }
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'handler');
  return args[Object.keys(args)[0]].factory;
}

const ctxConRequest = (request: unknown) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('CurrentEmpresa', () => {
  const factory = getParamDecoratorFactory(CurrentEmpresa);

  it('prioriza el empresaId que dejó el guard en req.acceso', () => {
    const req = {
      acceso: { empresaId: 7 },
      user: { empresaId: 99, rolNombre: 'GERENTE' },
    };

    expect(factory(undefined, ctxConRequest(req))).toEqual({
      empresaId: 7,
      rolNombre: 'GERENTE',
    });
  });

  it('cae al empresaId del JWT si la ruta no pasó por @Permissions', () => {
    const req = { user: { empresaId: 99, rolNombre: 'OPERARIO' } };

    expect(factory(undefined, ctxConRequest(req))).toEqual({
      empresaId: 99,
      rolNombre: 'OPERARIO',
    });
  });

  it('devuelve empresaId null si ni acceso ni user lo tienen (admin global)', () => {
    const req = { user: { rolNombre: 'ADMINISTRADOR' } };

    expect(factory(undefined, ctxConRequest(req))).toEqual({
      empresaId: null,
      rolNombre: 'ADMINISTRADOR',
    });
  });

  it('devuelve todo en null si el request no tiene acceso ni user', () => {
    expect(factory(undefined, ctxConRequest({}))).toEqual({
      empresaId: null,
      rolNombre: null,
    });
  });

  it('acepta empresaId 0 en acceso sin caer al JWT (?? solo salta null/undefined)', () => {
    const req = { acceso: { empresaId: 0 }, user: { empresaId: 99 } };

    expect(factory(undefined, ctxConRequest(req)).empresaId).toBe(0);
  });
});