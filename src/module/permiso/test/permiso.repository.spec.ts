import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
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
    it('deberia buscar por id cargando la relacion rol y filtrando por empresaId', async () => {
      mockPermisoTypeormRepo.findOne.mockResolvedValue(null);

      await repository.findById(1, 1);

      expect(mockPermisoTypeormRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1, empresaId: 1 },
        relations: { rol: true },
      });
    });
  });

  describe('findByRol', () => {
    it('deberia listar los permisos de un rol cargando la relacion rol y filtrando por empresaId', async () => {
      mockPermisoTypeormRepo.find.mockResolvedValue([]);

      await repository.findByRol(5, 0);

      expect(mockPermisoTypeormRepo.find).toHaveBeenCalledWith({
        where: { rol: { id: 5 }, empresaId: 0 },
        relations: { rol: true },
      });
    });
  });

  describe('findByUsuario - permisos efectivos via el rol del usuario', () => {
    it('deberia buscar al usuario con su empresa y luego llamar a findByRolYEmpresa', async () => {
      const permisos = [
        {
          id: 1,
          modulo: ModuloSistema.DASHBOARD,
          canRead: true,
          canWrite: false,
        },
      ] as PermisoModulo[];

      mockUserTypeormRepo.findOne.mockResolvedValue({
        id: 10,
        rol: { id: 5 },
      });
      mockPermisoTypeormRepo.find.mockResolvedValue(permisos);

      const result = await repository.findByUsuario(10, 5);

      expect(mockUserTypeormRepo.findOne).toHaveBeenCalledWith({
        where: { id: 10, empresa: { id: 5 } },
        relations: { rol: true },
      });
      expect(mockPermisoTypeormRepo.find).toHaveBeenCalledWith({
        where: { rol: { id: 5 }, empresaId: 5 },
      });
      expect(result).toBe(permisos);
    });

    it('deberia devolver un array vacio si el usuario no existe', async () => {
      mockUserTypeormRepo.findOne.mockResolvedValue(null);

      const result = await repository.findByUsuario(999, 5);

      expect(result).toEqual([]);
    });

    it('deberia devolver un array vacio si el usuario no tiene rol asignado', async () => {
      mockUserTypeormRepo.findOne.mockResolvedValue({ id: 10, rol: null });

      const result = await repository.findByUsuario(10, 5);

      expect(result).toEqual([]);
    });
  });

  describe('findByRolYEmpresa', () => {
    it('deberia buscar permisos por rol e empresaId', async () => {
      const permisos = [{ id: 1 }] as PermisoModulo[];
      mockPermisoTypeormRepo.find.mockResolvedValue(permisos);

      const result = await repository.findByRolYEmpresa(5, 1);

      expect(mockPermisoTypeormRepo.find).toHaveBeenCalledWith({
        where: { rol: { id: 5 }, empresaId: 1 },
      });
      expect(result).toBe(permisos);
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

      const result = await repository.updatePermiso(1, 1, true, true);

      expect(mockPermisoTypeormRepo.update).toHaveBeenCalledWith(
        { id: 1, empresaId: 1 },
        { canRead: true, canWrite: true },
      );
      expect(mockPermisoTypeormRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1, empresaId: 1 },
        relations: { rol: true },
      });
      expect(result).toBe(updated);
    });

    it('deberia lanzar NotFoundException si el permiso no pertenece a la empresa (affected: 0)', async () => {
      mockPermisoTypeormRepo.update.mockResolvedValue({ affected: 0 });

      await expect(
        repository.updatePermiso(999, 1, false, false),
      ).rejects.toThrow(
        new NotFoundException('Permiso 999 no encontrado en la empresa'),
      );
    });

    it('deberia lanzar NotFoundException si no se encuentra el permiso tras actualizar', async () => {
      mockPermisoTypeormRepo.update.mockResolvedValue({ affected: 1 });
      mockPermisoTypeormRepo.findOne.mockResolvedValue(null);

      await expect(
        repository.updatePermiso(1, 1, false, false),
      ).rejects.toThrow(
        new NotFoundException('Permiso 1 no encontrado tras actualizar'),
      );
    });
  });
});