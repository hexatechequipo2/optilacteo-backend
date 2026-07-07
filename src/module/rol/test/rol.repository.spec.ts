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
    ...overrides,
  } as Rol;
}

describe('RolRepository', () => {
  let repository: RolRepository;
  let mockRolTypeormRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let mockPermisoTypeormRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(() => {
    mockRolTypeormRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
    it('deberia buscar por id cargando las relaciones permisos y empresa', async () => {
      mockRolTypeormRepo.findOne.mockResolvedValue(null);

      await repository.findById(5);

      expect(mockRolTypeormRepo.findOne).toHaveBeenCalledWith({
        where: { id: 5 },
        relations: { permisos: true, empresa: true },
      });
    });
  });

  describe('findAll', () => {
    it('deberia listar cargando las relaciones permisos y empresa', async () => {
      mockRolTypeormRepo.find.mockResolvedValue([]);

      await repository.findAll();

      expect(mockRolTypeormRepo.find).toHaveBeenCalledWith({
        relations: { permisos: true, empresa: true },
      });
    });
  });

  describe('findByEmpresa', () => {
    it('deberia filtrar por el id de empresa cargando permisos y empresa', async () => {
      mockRolTypeormRepo.find.mockResolvedValue([]);

      await repository.findByEmpresa(1);

      expect(mockRolTypeormRepo.find).toHaveBeenCalledWith({
        where: { empresa: { id: 1 } },
        relations: { permisos: true, empresa: true },
      });
    });
  });

  describe('createRol', () => {
    it('deberia crear la instancia con create() y persistirla con save()', async () => {
      const partial = { nombre: 'Supervisor de calidad' };
      const created = buildRol();
      mockRolTypeormRepo.create.mockReturnValue(created);
      mockRolTypeormRepo.save.mockResolvedValue(created);

      const result = await repository.createRol(partial);

      expect(mockRolTypeormRepo.create).toHaveBeenCalledWith(partial);
      expect(mockRolTypeormRepo.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });
  });

  describe('updateRol', () => {
    it('deberia actualizar y devolver el rol recargado con sus relaciones', async () => {
      const updated = buildRol({ nombre: 'Nuevo nombre' });
      mockRolTypeormRepo.update.mockResolvedValue({ affected: 1 });
      mockRolTypeormRepo.findOne.mockResolvedValue(updated);

      const result = await repository.updateRol(5, { nombre: 'Nuevo nombre' });

      expect(mockRolTypeormRepo.update).toHaveBeenCalledWith(5, { nombre: 'Nuevo nombre' });
      expect(result).toBe(updated);
    });

    it('deberia lanzar un Error si el rol no aparece al recargarlo tras el update', async () => {
      mockRolTypeormRepo.update.mockResolvedValue({ affected: 0 });
      mockRolTypeormRepo.findOne.mockResolvedValue(null);

      await expect(repository.updateRol(999, { nombre: 'x' })).rejects.toThrow(
        'Rol with id 999 not found after update',
      );
    });
  });

  describe('deleteRol', () => {
    it('deberia delegar en el delete de TypeORM', async () => {
      mockRolTypeormRepo.delete.mockResolvedValue({ affected: 1 });

      await repository.deleteRol(5);

      expect(mockRolTypeormRepo.delete).toHaveBeenCalledWith(5);
    });
  });

  describe('createPermisos', () => {
    it('deberia crear las instancias con create() y persistirlas con save()', async () => {
      const partial = [{ modulo: ModuloSistema.DASHBOARD, canRead: true, canWrite: false }];
      const created = [{ id: 1, ...partial[0] }] as PermisoModulo[];
      mockPermisoTypeormRepo.create.mockReturnValue(created);
      mockPermisoTypeormRepo.save.mockResolvedValue(created);

      const result = await repository.createPermisos(partial);

      expect(mockPermisoTypeormRepo.create).toHaveBeenCalledWith(partial);
      expect(mockPermisoTypeormRepo.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });
  });

  describe('findPermiso', () => {
    it('deberia buscar el permiso de un rol para un modulo especifico', async () => {
      mockPermisoTypeormRepo.findOne.mockResolvedValue(null);

      await repository.findPermiso(5, ModuloSistema.DASHBOARD);

      expect(mockPermisoTypeormRepo.findOne).toHaveBeenCalledWith({
        where: { rol: { id: 5 }, modulo: ModuloSistema.DASHBOARD },
        relations: { rol: true },
      });
    });
  });

  describe('updatePermiso', () => {
    it('deberia actualizar canRead/canWrite y devolver el permiso recargado', async () => {
      const updated = { id: 1, modulo: ModuloSistema.DASHBOARD, canRead: true, canWrite: true } as PermisoModulo;
      mockPermisoTypeormRepo.update.mockResolvedValue({ affected: 1 });
      mockPermisoTypeormRepo.findOne.mockResolvedValue(updated);

      const result = await repository.updatePermiso(1, true, true);

      expect(mockPermisoTypeormRepo.update).toHaveBeenCalledWith(1, { canRead: true, canWrite: true });
      expect(result).toBe(updated);
    });

    it('deberia lanzar un Error si el permiso no aparece al recargarlo tras el update', async () => {
      mockPermisoTypeormRepo.update.mockResolvedValue({ affected: 0 });
      mockPermisoTypeormRepo.findOne.mockResolvedValue(null);

      await expect(repository.updatePermiso(999, true, false)).rejects.toThrow(
        'PermisoModulo with id 999 not found after update',
      );
    });
  });

  describe('hasActiveUsers', () => {
    // NOTA: este metodo es codigo muerto -- RolService.remove() valida
    // usuarios activos directamente contra userRepository, sin pasar por
    // aca. La implementacion actual siempre devuelve false sin importar
    // el resultado de la query. Se documenta el comportamiento actual,
    // no se afirma que sea la fuente de verdad del negocio.
    it('siempre devuelve false, independientemente de lo que encuentre la query', async () => {
      mockRolTypeormRepo.findOne.mockResolvedValue(buildRol());

      const result = await repository.hasActiveUsers(5);

      expect(result).toBe(false);
    });
  });
});
