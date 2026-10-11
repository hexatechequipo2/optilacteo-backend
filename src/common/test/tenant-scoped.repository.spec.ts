import type { Repository } from 'typeorm';
import { TenantScopedRepository } from '../repository/tenant-scoped.repository';
import { ROLES } from '../../module/rol/constants/roles.constants';
import type { TenantContext } from '../types/tenant-context.type';

type Entidad = { id: number; empresaId: number; nombre?: string };

// Subclase que expone los métodos protected para poder testearlos.
class RepoDePrueba extends TenantScopedRepository<Entidad> {
  constructor(repo: Repository<Entidad>) {
    super(repo);
  }
  findAll = (...a: Parameters<TenantScopedRepository<Entidad>['findAllScoped']>) =>
    this.findAllScoped(...a);
  findPaginated = (
    ...a: Parameters<TenantScopedRepository<Entidad>['findAllScopedPaginated']>
  ) => this.findAllScopedPaginated(...a);
  findById = (...a: Parameters<TenantScopedRepository<Entidad>['findByIdScoped']>) =>
    this.findByIdScoped(...a);
  findOneBy = (...a: Parameters<TenantScopedRepository<Entidad>['findOneByScoped']>) =>
    this.findOneByScoped(...a);
}

describe('TenantScopedRepository — consultas con scope', () => {
  const repoMock = {
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
  };
  let repo: RepoDePrueba;

  const gerente = { empresaId: 10, rolNombre: 'GERENTE' } as TenantContext;
  const admin = { empresaId: null, rolNombre: ROLES.ADMINISTRADOR } as TenantContext;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new RepoDePrueba(repoMock as unknown as Repository<Entidad>);
  });

  describe('findAllScoped', () => {
    it('filtra por empresa para un usuario común y respeta las options', async () => {
      repoMock.find.mockResolvedValue([{ id: 1 }]);

      const res = await repo.findAll(gerente, { order: { id: 'ASC' } });

      expect(res).toEqual([{ id: 1 }]);
      expect(repoMock.find).toHaveBeenCalledWith({
        order: { id: 'ASC' },
        where: { empresaId: 10 },
      });
    });

    it('no filtra por empresa para el administrador global', async () => {
      repoMock.find.mockResolvedValue([]);

      await repo.findAll(admin);

      expect(repoMock.find).toHaveBeenCalledWith({ where: {} });
    });
  });

  describe('findAllScopedPaginated', () => {
    it('pasa skip/take y filtra por empresa', async () => {
      repoMock.findAndCount.mockResolvedValue([[{ id: 1 }], 1]);

      const res = await repo.findPaginated(gerente, 20, 10, { order: { id: 'DESC' } });

      expect(res).toEqual([[{ id: 1 }], 1]);
      expect(repoMock.findAndCount).toHaveBeenCalledWith({
        order: { id: 'DESC' },
        where: { empresaId: 10 },
        skip: 20,
        take: 10,
      });
    });

    it('no filtra por empresa para el administrador global', async () => {
      repoMock.findAndCount.mockResolvedValue([[], 0]);

      await repo.findPaginated(admin, 0, 5);

      expect(repoMock.findAndCount).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 5,
      });
    });
  });

  describe('findByIdScoped', () => {
    it('busca por id dentro de la empresa del usuario', async () => {
      repoMock.findOne.mockResolvedValue({ id: 5, empresaId: 10 });

      const res = await repo.findById(5, gerente);

      expect(res).toEqual({ id: 5, empresaId: 10 });
      expect(repoMock.findOne).toHaveBeenCalledWith({
        where: { id: 5, empresaId: 10 },
      });
    });

    it('el administrador global busca solo por id', async () => {
      repoMock.findOne.mockResolvedValue(null);

      const res = await repo.findById(5, admin);

      expect(res).toBeNull();
      expect(repoMock.findOne).toHaveBeenCalledWith({ where: { id: 5 } });
    });
  });

  describe('findOneByScoped', () => {
    it('combina el filtro extra con la empresa del usuario', async () => {
      repoMock.findOne.mockResolvedValue({ id: 1 });

      await repo.findOneBy(gerente, { nombre: 'X' });

      expect(repoMock.findOne).toHaveBeenCalledWith({
        where: { nombre: 'X', empresaId: 10 },
      });
    });

    it('el administrador global usa solo el filtro extra', async () => {
      repoMock.findOne.mockResolvedValue(null);

      await repo.findOneBy(admin, { nombre: 'X' });

      expect(repoMock.findOne).toHaveBeenCalledWith({ where: { nombre: 'X' } });
    });

    it('no permite que el filtro extra pise el empresaId del usuario', async () => {
      repoMock.findOne.mockResolvedValue(null);

      await repo.findOneBy(gerente, { empresaId: 999 });

      expect(repoMock.findOne).toHaveBeenCalledWith({ where: { empresaId: 10 } });
    });
  });
});