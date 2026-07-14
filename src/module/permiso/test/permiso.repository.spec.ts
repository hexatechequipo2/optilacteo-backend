import { Repository } from 'typeorm';
import { PermisoRepository } from '../repository/permiso.repository';
import { PermisoModulo } from '../entities/permiso-modulo.entity';
import { User } from '../../user/entities/user.entity';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';

describe('PermisoRepository', () => {
  let repository: PermisoRepository;
  let mockPermisoTypeormRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let mockUserTypeormRepo: {
    findOne: jest.Mock;
  };

  beforeEach(() => {
    mockPermisoTypeormRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    mockUserTypeormRepo = {
      findOne: jest.fn(),
    };
    repository = new PermisoRepository(
      mockPermisoTypeormRepo as unknown as Repository<PermisoModulo>,
      mockUserTypeormRepo as unknown as Repository<User>,
    );
  });

  describe('findById', () => {
    it('deberia buscar por id cargando la relacion rol', async () => {
      mockPermisoTypeormRepo.findOne.mockResolvedValue(null);

      await repository.findById(1);

      expect(mockPermisoTypeormRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: { rol: true },
      });
    });
  });

  describe('findByRol', () => {
    it('deberia listar los permisos de un rol cargando la relacion rol', async () => {
      mockPermisoTypeormRepo.find.mockResolvedValue([]);

      await repository.findByRol(5);

      expect(mockPermisoTypeormRepo.find).toHaveBeenCalledWith({
        where: { rol: { id: 5 } },
        relations: { rol: true },
      });
    });
  });

  describe('findByUsuario - permisos efectivos via el rol del usuario', () => {
    it('deberia buscar al usuario con su rol y los permisos de ese rol', async () => {
      const permisos = [
        { id: 1, modulo: ModuloSistema.DASHBOARD, canRead: true, canWrite: false },
      ] as PermisoModulo[];
      mockUserTypeormRepo.findOne.mockResolvedValue({
        id: 10,
        rol: { id: 5, permisos },
      });

      const result = await repository.findByUsuario(10);

      expect(mockUserTypeormRepo.findOne).toHaveBeenCalledWith({
        where: { id: 10 },
        relations: { rol: { permisos: true } },
      });
      expect(result).toBe(permisos);
    });

    it('deberia devolver un array vacio si el usuario no existe', async () => {
      mockUserTypeormRepo.findOne.mockResolvedValue(null);

      const result = await repository.findByUsuario(999);

      expect(result).toEqual([]);
    });

    it('deberia devolver un array vacio si el usuario no tiene rol asignado', async () => {
      mockUserTypeormRepo.findOne.mockResolvedValue({ id: 10, rol: null });

      const result = await repository.findByUsuario(10);

      expect(result).toEqual([]);
    });

    it('deberia devolver un array vacio si el rol no tiene permisos cargados', async () => {
      mockUserTypeormRepo.findOne.mockResolvedValue({ id: 10, rol: { id: 5, permisos: undefined } });

      const result = await repository.findByUsuario(10);

      expect(result).toEqual([]);
    });
  });

  describe('updatePermiso', () => {
    it('deberia actualizar canRead/canWrite y devolver el permiso recargado', async () => {
      const updated = {
        id: 1,
        modulo: ModuloSistema.DASHBOARD,
        canRead: true,
        canWrite: true,
      } as PermisoModulo;
      mockPermisoTypeormRepo.update.mockResolvedValue({ affected: 1 });
      mockPermisoTypeormRepo.findOne.mockResolvedValue(updated);

      const result = await repository.updatePermiso(1, true, true);

      expect(mockPermisoTypeormRepo.update).toHaveBeenCalledWith(1, {
        canRead: true,
        canWrite: true,
      });
      expect(result).toBe(updated);
    });

    it('deberia lanzar un Error si el permiso no aparece al recargarlo tras el update', async () => {
      mockPermisoTypeormRepo.update.mockResolvedValue({ affected: 0 });
      mockPermisoTypeormRepo.findOne.mockResolvedValue(null);

      await expect(repository.updatePermiso(999, false, false)).rejects.toThrow(
        'PermisoModulo with id 999 not found after update',
      );
    });
  });
});
