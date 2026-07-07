import { Repository } from 'typeorm';
import { UserRepository } from '../repository/user.repository';
import { User } from '../entities/user.entity';

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
    };
    repository = new UserRepository(mockTypeormRepo as unknown as Repository<User>);
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
    it('deberia listar cargando las relaciones empresa y rol', async () => {
      mockTypeormRepo.find.mockResolvedValue([]);

      await repository.findAll();

      expect(mockTypeormRepo.find).toHaveBeenCalledWith({
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

      expect(mockTypeormRepo.update).toHaveBeenCalledWith(10, { name: 'Nuevo nombre' });
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
});
