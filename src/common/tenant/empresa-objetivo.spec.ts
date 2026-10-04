import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  EmpresaObjetivoGuard,
  resolverEmpresaObjetivo,
  type RequestConEmpresaObjetivo,
} from './empresa-objetivo';

const admin = { esSistema: true, empresaId: null };
const gerenteA = { esSistema: false, empresaId: 1 };
const existen = (ids: number[]) => (id: number) =>
  Promise.resolve(ids.includes(id));

describe('resolverEmpresaObjetivo (HU-72, criterio 5)', () => {
  describe('Administrador (rol de sistema, sin empresa)', () => {
    it.each([1, 2, '2'])(
      'opera sobre la empresa indicada (%p)',
      async (pedido) => {
        await expect(
          resolverEmpresaObjetivo(admin, pedido, existen([1, 2])),
        ).resolves.toBe(Number(pedido));
      },
    );

    it.each([undefined, ''])('sin empresaId (%p) → 400', async (pedido) => {
      await expect(
        resolverEmpresaObjetivo(admin, pedido, existen([1])),
      ).rejects.toThrow(BadRequestException);
    });

    it.each(['abc', 0, -3, 1.5])(
      'empresaId inválido (%p) → 400',
      async (pedido) => {
        await expect(
          resolverEmpresaObjetivo(admin, pedido, existen([1])),
        ).rejects.toThrow(BadRequestException);
      },
    );

    it('empresa inexistente → 404', async () => {
      await expect(
        resolverEmpresaObjetivo(admin, 99, existen([1])),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cualquier otro rol', () => {
    it('sin empresaId usa la suya', async () => {
      await expect(
        resolverEmpresaObjetivo(gerenteA, undefined, existen([])),
      ).resolves.toBe(1);
    });

    it('con su propia empresaId usa la suya', async () => {
      await expect(
        resolverEmpresaObjetivo(gerenteA, '1', existen([])),
      ).resolves.toBe(1);
    });

    it('con empresaId de otra empresa → 403, aunque exista', async () => {
      const existe = jest.fn().mockResolvedValue(true);
      await expect(
        resolverEmpresaObjetivo(gerenteA, 2, existe),
      ).rejects.toThrow(ForbiddenException);
      expect(existe).not.toHaveBeenCalled();
    });

    it('usuario de empresa sin empresa asociada → 403', async () => {
      await expect(
        resolverEmpresaObjetivo(
          { esSistema: false, empresaId: null },
          undefined,
          existen([1]),
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

describe('EmpresaObjetivoGuard', () => {
  const existsBy = jest.fn();
  const guard = new EmpresaObjetivoGuard({
    getRepository: () => ({ existsBy }),
  } as never);

  const ctx = (req: Partial<RequestConEmpresaObjetivo>) =>
    ({
      switchToHttp: () => ({ getRequest: () => req }),
    }) as unknown as ExecutionContext;

  beforeEach(() => existsBy.mockReset().mockResolvedValue(true));

  it('toma empresaId de la query y lo deja en el request', async () => {
    const req = { acceso: admin, query: { empresaId: '2' }, body: {} };
    await expect(guard.canActivate(ctx(req as never))).resolves.toBe(true);
    expect(req).toMatchObject({ empresaObjetivoId: 2 });
    expect(existsBy).toHaveBeenCalledWith({ id: 2 });
  });

  it('toma empresaId del body si no viene en la query', async () => {
    const req = { acceso: admin, query: {}, body: { empresaId: 1 } };
    await guard.canActivate(ctx(req as never));
    expect(req).toMatchObject({ empresaObjetivoId: 1 });
  });

  it('query y body distintos → 400', async () => {
    const req = {
      acceso: admin,
      query: { empresaId: '1' },
      body: { empresaId: 2 },
    };
    await expect(guard.canActivate(ctx(req as never))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('sin acceso resuelto por el PermissionsGuard → 403', async () => {
    await expect(
      guard.canActivate(ctx({ query: {}, body: {} })),
    ).rejects.toThrow(ForbiddenException);
  });
});
