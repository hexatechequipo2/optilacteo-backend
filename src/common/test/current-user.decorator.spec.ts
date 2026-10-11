import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from '../decorators/current-user.decorator';

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

describe('CurrentUser', () => {
  const factory = getParamDecoratorFactory(CurrentUser);

  describe('cuando el guard dejó req.acceso', () => {
    it('mapea los datos de acceso e ignora req.user', () => {
      const req = {
        acceso: { userId: 1, rolId: 2, empresaId: 3, esSistema: true },
        user: { id: 99, rolId: 98, empresaId: 97 },
      };

      expect(factory(undefined, ctxConRequest(req))).toEqual({
        id: 1,
        rolId: 2,
        empresaId: 3,
        esSistema: true,
      });
    });
  });

  describe('cuando no hay req.acceso (fallback al JWT)', () => {
    it('usa user.id si existe', () => {
      const req = { user: { id: 10, rolId: 2, empresaId: 5 } };

      expect(factory(undefined, ctxConRequest(req))).toEqual({
        id: 10,
        rolId: 2,
        empresaId: 5,
        esSistema: false,
      });
    });

    it('cae a user.userId si no hay id', () => {
      const req = { user: { userId: 11 } };

      expect(factory(undefined, ctxConRequest(req)).id).toBe(11);
    });

    it('cae a user.sub si no hay id ni userId', () => {
      const req = { user: { sub: 12 } };

      expect(factory(undefined, ctxConRequest(req)).id).toBe(12);
    });

    it('usa null para rolId y empresaId si el JWT no los trae', () => {
      const req = { user: { id: 10 } };

      expect(factory(undefined, ctxConRequest(req))).toEqual({
        id: 10,
        rolId: null,
        empresaId: null,
        esSistema: false,
      });
    });

    it('no rompe si no hay user (id queda undefined)', () => {
      expect(factory(undefined, ctxConRequest({}))).toEqual({
        id: undefined,
        rolId: null,
        empresaId: null,
        esSistema: false,
      });
    });
  });
});