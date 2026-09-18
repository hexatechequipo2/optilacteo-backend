import { Repository } from 'typeorm';
import { RolRepository } from '../repository/rol.repository';
import { Rol } from '../entities/rol.entity';
import { PermisoModulo } from '../../permiso/entities/permiso-modulo.entity';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';

function buildRol(overrides: Partial<Rol> = {}): Rol {
  return {
    id: 5,
    nombre: 'Supervisor de calidad',
    descripcion: 'Accede a módulos de calidad y reportes',
    isActive: true,
    empresa: { id: 1, name: 'Lacteos Norte' } as Rol['empresa'],
    permisos: [],
    users: [],
    ...overrides,
  };
}

describe('RolRepository', () => {
  let repository: RolRepository;
  let mockQueryBuilder: {
    leftJoinAndSelect: jest.Mock;
    getMany: jest.Mock;
  };
  let mockRolTypeormRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let mockPermisoTypeormRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(() => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    mockRolTypeormRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    mockPermisoTypeormRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    repository = new RolRepository(
      mockRolTypeormRepo as unknown as Repository<Rol>,
      mockPermisoTypeormRepo as unknown as Repository<PermisoModulo>,
    );
  });

  describe('findById', () => {
    it('debería retornar un rol por ID con sus relaciones', async () => {
      const mockRol = buildRol({ id: 5 });
      mockRolTypeormRepo.findOne.mockResolvedValue(mockRol);

      const result = await repository.findById(5);

      expect(mockRolTypeormRepo.findOne).toHaveBeenCalledWith({
        where: { id: 5 },
        relations: { permisos: true, empresa: true },
      });
      expect(result).toBe(mockRol);
    });

    it('debería retornar null si no encuentra el rol', async () => {
      mockRolTypeormRepo.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('debería listar cargando las relaciones sin filtro de empresaId', async () => {
      const rolesMock = [buildRol()];
      mockQueryBuilder.getMany.mockResolvedValue(rolesMock);

      const result = await repository.findAll();

      expect(mockRolTypeormRepo.createQueryBuilder).toHaveBeenCalledWith('rol');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('rol.empresa', 'empresa');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('rol.permisos', 'permisos');
      expect(result).toBe(rolesMock);
    });

    it('debería filtrar permisos por empresaId si se le proporciona', async () => {
      const rolesMock = [buildRol()];
      mockQueryBuilder.getMany.mockResolvedValue(rolesMock);

      await repository.findAll(1);

      expect(mockRolTypeormRepo.createQueryBuilder).toHaveBeenCalledWith('rol');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('rol.empresa', 'empresa');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'rol.permisos',
        'permisos',
        'permisos.empresaId = :empresaId',
        { empresaId: 1 },
      );
    });
  });

  describe('findByEmpresa', () => {
    it('debería buscar roles filtrados por el ID de empresa', async () => {
      const rolesMock = [buildRol({ id: 1 }), buildRol({ id: 2 })];
      mockRolTypeormRepo.find.mockResolvedValue(rolesMock);

      const result = await repository.findByEmpresa(1);

      expect(mockRolTypeormRepo.find).toHaveBeenCalledWith({
        where: { empresa: { id: 1 } },
        relations: { permisos: true, empresa: true },
      });
      expect(result).toBe(rolesMock);
    });
  });

  describe('createRol', () => {
    it('debería instanciar y guardar un nuevo rol', async () => {
      const dtoPartial: Partial<Rol> = { nombre: 'Nuevo Rol' };
      const createdEntity = { ...dtoPartial } as Rol;
      const savedEntity = { id: 10, ...dtoPartial } as Rol;

      mockRolTypeormRepo.create.mockReturnValue(createdEntity);
      mockRolTypeormRepo.save.mockResolvedValue(savedEntity);

      const result = await repository.createRol(dtoPartial);

      expect(mockRolTypeormRepo.create).toHaveBeenCalledWith(dtoPartial);
      expect(mockRolTypeormRepo.save).toHaveBeenCalledWith(createdEntity);
      expect(result).toBe(savedEntity);
    });
  });

  describe('updateRol', () => {
    it('debería actualizar el rol y retornar la entidad actualizada', async () => {
      const updateDto: Partial<Rol> = { nombre: 'Nombre Editado' };
      const updatedRol = buildRol({ id: 5, nombre: 'Nombre Editado' });

      mockRolTypeormRepo.update.mockResolvedValue({ affected: 1 });
      mockRolTypeormRepo.findOne.mockResolvedValue(updatedRol);

      const result = await repository.updateRol(5, updateDto);

      expect(mockRolTypeormRepo.update).toHaveBeenCalledWith(5, updateDto);
      expect(mockRolTypeormRepo.findOne).toHaveBeenCalledWith({
        where: { id: 5 },
        relations: { permisos: true, empresa: true },
      });
      expect(result).toBe(updatedRol);
    });

    it('debería lanzar un error si el rol no se encuentra tras la actualización', async () => {
      mockRolTypeormRepo.update.mockResolvedValue({ affected: 0 });
      mockRolTypeormRepo.findOne.mockResolvedValue(null);

      await expect(repository.updateRol(99, { nombre: 'Test' })).rejects.toThrow(
        'Rol with id 99 not found after update',
      );
    });
  });

  describe('deleteRol', () => {
    it('debería llamar al método delete del repositorio TypeORM', async () => {
      mockRolTypeormRepo.delete.mockResolvedValue({ affected: 1 });

      await repository.deleteRol(5);

      expect(mockRolTypeormRepo.delete).toHaveBeenCalledWith(5);
    });
  });

  describe('hasActiveUsers', () => {
    it('debería retornar false por defecto', async () => {
      const result = await repository.hasActiveUsers(5);
      expect(result).toBe(false);
    });
  });

  describe('createPermisos', () => {
    it('debería instanciar y guardar la lista de permisos', async () => {
      const permisosInput = [{ modulo: ModuloSistema.RECEPCION, canRead: true }];
      const createdPermisos = [...permisosInput] as PermisoModulo[];
      const savedPermisos = [{ id: 1, ...permisosInput[0] }] as PermisoModulo[];

      mockPermisoTypeormRepo.create.mockReturnValue(createdPermisos);
      mockPermisoTypeormRepo.save.mockResolvedValue(savedPermisos);

      const result = await repository.createPermisos(permisosInput as any);

      expect(mockPermisoTypeormRepo.create).toHaveBeenCalledWith(permisosInput);
      expect(mockPermisoTypeormRepo.save).toHaveBeenCalledWith(createdPermisos);
      expect(result).toBe(savedPermisos);
    });
  });

  describe('findPermiso', () => {
    it('debería buscar un permiso por rolId y modulo', async () => {
      const permisoMock = { id: 10, modulo: ModuloSistema.RECEPCION } as PermisoModulo;
      mockPermisoTypeormRepo.findOne.mockResolvedValue(permisoMock);

      const result = await repository.findPermiso(5, ModuloSistema.RECEPCION);

      expect(mockPermisoTypeormRepo.findOne).toHaveBeenCalledWith({
        where: { rol: { id: 5 }, modulo: ModuloSistema.RECEPCION },
        relations: { rol: true },
      });
      expect(result).toBe(permisoMock);
    });
  });

  describe('updatePermiso', () => {
    it('debería actualizar los permisos canRead y canWrite y retornar la entidad', async () => {
      const updatedPermiso = { id: 10, canRead: true, canWrite: false } as PermisoModulo;

      mockPermisoTypeormRepo.update.mockResolvedValue({ affected: 1 });
      mockPermisoTypeormRepo.findOne.mockResolvedValue(updatedPermiso);

      const result = await repository.updatePermiso(10, true, false);

      expect(mockPermisoTypeormRepo.update).toHaveBeenCalledWith(10, {
        canRead: true,
        canWrite: false,
      });
      expect(mockPermisoTypeormRepo.findOne).toHaveBeenCalledWith({ where: { id: 10 } });
      expect(result).toBe(updatedPermiso);
    });

    it('debería lanzar un error si el permiso no existe tras la actualización', async () => {
      mockPermisoTypeormRepo.update.mockResolvedValue({ affected: 0 });
      mockPermisoTypeormRepo.findOne.mockResolvedValue(null);

      await expect(repository.updatePermiso(99, true, true)).rejects.toThrow(
        'PermisoModulo with id 99 not found after update',
      );
    });
  });
});