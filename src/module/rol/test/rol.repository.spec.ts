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

  describe('findAll', () => {
    it('deberia listar cargando las relaciones sin filtro de empresaId', async () => {
      const rolesMock = [buildRol()];
      mockQueryBuilder.getMany.mockResolvedValue(rolesMock);

      const result = await repository.findAll();

      expect(mockRolTypeormRepo.createQueryBuilder).toHaveBeenCalledWith('rol');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('rol.empresa', 'empresa');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('rol.permisos', 'permisos');
      expect(result).toBe(rolesMock);
    });

    it('deberia filtrar permisos por empresaId si se le proporciona', async () => {
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
});