import { Repository } from 'typeorm';
import { UserRepository } from '../repository/user.repository';
import { User } from '../entities/user.entity';
import { ROLES } from '../../rol/constants/roles.constants';
import type { TenantContext } from '../../../common/types/tenant-context.type';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 10,
    name: 'Juan Pérez',
    email: 'juan@lacteosnorte.com',
    password: 'hash_seguro',
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    empresa: { id: 1, name: 'Lacteos Norte' } as User['empresa'],
    rol: { id: 2, nombre: 'GERENTE' } as User['rol'],
    ...overrides,
  } as User;
}

describe('UserRepository', () => {
  let repository: UserRepository;
  let mockTypeormRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
    increment: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(() => {
    mockTypeormRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      increment: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    repository = new UserRepository(
      mockTypeormRepo as unknown as Repository<User>,
    );
  });

  describe('findByEmail', () => {
    it('deberia buscar por email cargando las relaciones empresa y rol.permisos', async () => {
      mockTypeormRepo.findOne.mockResolvedValue(null);

      await repository.findByEmail('juan@lacteosnorte.com');

      expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'juan@lacteosnorte.com' },
        relations: { empresa: true, rol: { permisos: true } },
      });
    });
  });

  describe('findById', () => {
    it('deberia buscar por id cargando las relaciones empresa y rol.permisos', async () => {
      mockTypeormRepo.findOne.mockResolvedValue(null);

      await repository.findById(10);

      expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
        where: { id: 10 },
        relations: { empresa: true, rol: { permisos: true } },
      });
    });
  });

  describe('findAll', () => {
    it('deberia listar sin filtro de empresa cuando el tenant es Administrador', async () => {
      mockTypeormRepo.find.mockResolvedValue([]);
      const tenant: TenantContext = { empresaId: null, rolNombre: ROLES.ADMINISTRADOR };

      await repository.findAll(tenant);

      expect(mockTypeormRepo.find).toHaveBeenCalledWith({
        where: {},
        relations: { empresa: true, rol: true },
      });
    });

    it('deberia filtrar por la empresa del tenant cuando no es Administrador', async () => {
      mockTypeormRepo.find.mockResolvedValue([]);
      const tenant: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };

      await repository.findAll(tenant);

      expect(mockTypeormRepo.find).toHaveBeenCalledWith({
        where: { empresa: { id: 1 } },
        relations: { empresa: true, rol: true },
      });
    });
  });

  describe('createUser', () => {
    it('deberia crear la instancia con create() y persistirla con save()', async () => {
      const partial = { name: 'Juan Pérez', email: 'juan@lacteosnorte.com' };
      const created = buildUser();
      mockTypeormRepo.create.mockReturnValue(created);
      mockTypeormRepo.save.mockResolvedValue(created);

      const result = await repository.createUser(partial);

      expect(mockTypeormRepo.create).toHaveBeenCalledWith(partial);
      expect(mockTypeormRepo.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });
  });

  describe('updateUser', () => {
    it('deberia actualizar y devolver el usuario recargado con sus relaciones', async () => {
      const updatedUser = buildUser({ name: 'Nuevo nombre' });
      mockTypeormRepo.update.mockResolvedValue({ affected: 1 });
      mockTypeormRepo.findOne.mockResolvedValue(updatedUser);

      const result = await repository.updateUser(10, { name: 'Nuevo nombre' });

      expect(mockTypeormRepo.update).toHaveBeenCalledWith(10, {
        name: 'Nuevo nombre',
      });
      expect(result).toBe(updatedUser);
    });

    it('deberia lanzar un Error si el usuario no aparece al recargarlo tras el update', async () => {
      mockTypeormRepo.update.mockResolvedValue({ affected: 0 });
      mockTypeormRepo.findOne.mockResolvedValue(null);

      await expect(repository.updateUser(999, { name: 'x' })).rejects.toThrow(
        'User with id 999 not found after update',
      );
    });
  });

  describe('deleteUser', () => {
    it('deberia delegar en el delete de TypeORM', async () => {
      mockTypeormRepo.delete.mockResolvedValue({ affected: 1 });

      await repository.deleteUser(10);

      expect(mockTypeormRepo.delete).toHaveBeenCalledWith(10);
    });
  });

  describe('updatePassword', () => {
    it('deberia actualizar solo el campo password con el hash recibido', async () => {
      mockTypeormRepo.update.mockResolvedValue({ affected: 1 });

      await repository.updatePassword('10', 'nuevo_hash');

      expect(mockTypeormRepo.update).toHaveBeenCalledWith('10', { password: 'nuevo_hash' });
    });
  });

  describe('incrementFailedAttempts', () => {
    it('deberia incrementar failedLoginAttempts en 1', async () => {
      await repository.incrementFailedAttempts(10);

      expect(mockTypeormRepo.increment).toHaveBeenCalledWith({ id: 10 }, 'failedLoginAttempts', 1);
    });
  });

  describe('lockUser', () => {
    it('deberia actualizar lockedUntil con la fecha recibida', async () => {
      const lockedUntil = new Date('2026-01-01T00:00:00Z');

      await repository.lockUser(10, lockedUntil);

      expect(mockTypeormRepo.update).toHaveBeenCalledWith(10, { lockedUntil });
    });
  });

  describe('resetFailedAttempts', () => {
    it('deberia resetear failedLoginAttempts a 0 y lockedUntil a null', async () => {
      await repository.resetFailedAttempts(10);

      expect(mockTypeormRepo.update).toHaveBeenCalledWith(10, {
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
    });
  });

  describe('countByEmpresa', () => {
    it('deberia contar usuarios filtrando por el id de empresa', async () => {
      mockTypeormRepo.count.mockResolvedValue(4);

      const result = await repository.countByEmpresa(1);

      expect(mockTypeormRepo.count).toHaveBeenCalledWith({ where: { empresa: { id: 1 } } });
      expect(result).toBe(4);
    });
  });

  describe('findAllPaginated', () => {
    let mockQb: {
      leftJoinAndSelect: jest.Mock;
      andWhere: jest.Mock;
      orderBy: jest.Mock;
      skip: jest.Mock;
      take: jest.Mock;
      getManyAndCount: jest.Mock;
    };

    beforeEach(() => {
      mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
      };
      mockTypeormRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQb);
    });

    it('deberia retornar usuarios paginados sin filtro de empresa cuando es Administrador', async () => {
      // Arrange
      const users = [buildUser()];
      mockQb.getManyAndCount.mockResolvedValue([users, 1]);
      const tenant: TenantContext = { empresaId: null, rolNombre: ROLES.ADMINISTRADOR };

      // Act
      const result = await repository.findAllPaginated(tenant, 0, 10);

      // Assert
      expect(result).toEqual([users, 1]);
      expect(mockQb.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('tenantEmpresaId'),
        expect.anything(),
      );
    });

    it('deberia filtrar por empresa cuando el tenant no es Administrador', async () => {
      // Arrange
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      const tenant: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };

      // Act
      await repository.findAllPaginated(tenant, 0, 10);

      // Assert
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'empresa.id = :tenantEmpresaId',
        { tenantEmpresaId: 1 },
      );
    });

    it('deberia aplicar filtro de nombre cuando se recibe filters.name', async () => {
      // Arrange
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      const tenant: TenantContext = { empresaId: null, rolNombre: ROLES.ADMINISTRADOR };

      // Act
      await repository.findAllPaginated(tenant, 0, 10, { name: 'Juan' });

      // Assert
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        '(user.name ILIKE :term OR user.email ILIKE :term)',
        { term: '%Juan%' },
      );
    });

    it('deberia aplicar filtro de isActive cuando se recibe filters.isActive', async () => {
      // Arrange
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      const tenant: TenantContext = { empresaId: null, rolNombre: ROLES.ADMINISTRADOR };

      // Act
      await repository.findAllPaginated(tenant, 0, 10, { isActive: false });

      // Assert
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'user.isActive = :isActive',
        { isActive: false },
      );
    });

    it('deberia aplicar filtro de rolId cuando se recibe filters.rolId', async () => {
      // Arrange
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      const tenant: TenantContext = { empresaId: null, rolNombre: ROLES.ADMINISTRADOR };

      // Act
      await repository.findAllPaginated(tenant, 0, 10, { rolId: 2 });

      // Assert
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'rol.id = :rolId',
        { rolId: 2 },
      );
    });

    it('deberia aplicar filtro de empresaId solo cuando el tenant es Administrador', async () => {
      // Arrange
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      const tenant: TenantContext = {
        empresaId: null,
        rolNombre: ROLES.ADMINISTRADOR,
      };

      // Act
      await repository.findAllPaginated(tenant, 0, 10, { empresaId: 3 });

      // Assert
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'empresa.id = :filterEmpresaId',
        { filterEmpresaId: 3 },
      );
    });
  });
});
