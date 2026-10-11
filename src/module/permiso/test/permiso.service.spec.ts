import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PermisoService } from '../permiso.service';
import { IPermisoRepository } from '../repository/permiso-interface.repository';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';
import { PermisoModulo } from '../entities/permiso-modulo.entity';
import { Repository, EntityManager } from 'typeorm';
import { User } from '../../user/entities/user.entity';

function buildPermiso(overrides: Partial<PermisoModulo> = {}): PermisoModulo {
  return {
    id: 1,
    empresaId: 1,
    empresa: {} as any,
    modulo: ModuloSistema.DASHBOARD,
    canRead: true,
    canWrite: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canExport: false,
    rol: { id: 5, nombre: 'Gerente' } as any,
    ...overrides,
  };
}

describe('PermisoService', () => {
  let service: PermisoService;
  let mockPermisoRepository: jest.Mocked<IPermisoRepository>;
  let mockUserRepo: jest.Mocked<Partial<Repository<User>>>;
  let mockPermisoRepo: jest.Mocked<Partial<Repository<PermisoModulo>>>;

  beforeEach(() => {
    mockPermisoRepository = {
      findById: jest.fn(),
      findByRol: jest.fn(),
      findByUsuario: jest.fn(),
      findByRolYEmpresa: jest.fn(),
      updatePermiso: jest.fn(),
    };

    mockUserRepo = {
      createQueryBuilder: jest.fn(),
    };

    mockPermisoRepo = {
      find: jest.fn(),
      manager: {
        query: jest.fn(),
      } as unknown as EntityManager,
    };

    service = new PermisoService(
      mockPermisoRepository,
      mockUserRepo as Repository<User>,
      mockPermisoRepo as Repository<PermisoModulo>,
    );
  });

  describe('findByRol', () => {
    it('deberia retornar lista mapeada de permisos del rol', async () => {
      const permisos = [buildPermiso()];
      mockPermisoRepository.findByRol.mockResolvedValue(permisos);

      const result = await service.findByRol(5, 1);

      expect(mockPermisoRepository.findByRol).toHaveBeenCalledWith(5, 1);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('modulo', ModuloSistema.DASHBOARD);
      expect(result[0]).toHaveProperty('canRead', true);
    });
  });

  describe('findByUsuario', () => {
    it('deberia retornar permisos mapeados para el usuario', async () => {
      const permisos = [buildPermiso()];
      mockPermisoRepository.findByUsuario.mockResolvedValue(permisos);

      const result = await service.findByUsuario(10, 1);

      expect(mockPermisoRepository.findByUsuario).toHaveBeenCalledWith(10, 1);
      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('modulo', ModuloSistema.DASHBOARD);
    });
  });

  describe('findOne', () => {
    it('deberia retornar el permiso mapeado si existe', async () => {
      const permiso = buildPermiso();
      mockPermisoRepository.findById.mockResolvedValue(permiso);

      const result = await service.findOne(1, 1);

      expect(mockPermisoRepository.findById).toHaveBeenCalledWith(1, 1);
      expect(result).toHaveProperty('id', 1);
    });

    it('deberia lanzar NotFoundException si no existe el permiso', async () => {
      mockPermisoRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('obtenerAcceso', () => {
    it('deberia retornar null si el usuario no existe o esta inactivo', async () => {
      const mockQueryBuilder: any = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      (mockUserRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await service.obtenerAcceso(10);

      expect(result).toBeNull();
    });

    it('deberia retornar acceso de sistema si el rol es de sistema', async () => {
      const mockUser = {
        id: 10,
        isActive: true,
        rol: { id: 1, nombre: 'SuperAdmin', isActive: true, esSistema: true },
        empresa: { id: 1 },
      };
      const mockQueryBuilder: any = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      (mockUserRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await service.obtenerAcceso(10);

      expect(result).toEqual({
        userId: 10,
        rolId: 1,
        rolNombre: 'SuperAdmin',
        empresaId: 1,
        esSistema: true,
        permisos: [],
      });
    });

    it('deberia cargar y retornar los permisos de BD para usuarios regulares', async () => {
      const mockUser = {
        id: 10,
        isActive: true,
        rol: { id: 5, nombre: 'Gerente', isActive: true, esSistema: false },
        empresa: { id: 1 },
      };
      const mockPermisos = [buildPermiso()];

      const mockQueryBuilder: any = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      (mockUserRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);
      (mockPermisoRepo.find as jest.Mock).mockResolvedValue(mockPermisos);

      const result = await service.obtenerAcceso(10);

      expect(result).toEqual({
        userId: 10,
        rolId: 5,
        rolNombre: 'Gerente',
        empresaId: 1,
        esSistema: false,
        permisos: mockPermisos,
      });
      expect(mockPermisoRepo.find).toHaveBeenCalledWith({
        where: { empresaId: 1, rol: { id: 5 } },
      });
    });
  });

  describe('obtenerMisPermisos', () => {
    it('deberia lanzar ForbiddenException si obtenerAcceso retorna null', async () => {
      jest.spyOn(service, 'obtenerAcceso').mockResolvedValue(null);

      await expect(service.obtenerMisPermisos(10)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deberia mapear y retornar la respuesta si obtenerAcceso retorna datos', async () => {
      const acceso = {
        userId: 10,
        rolId: 5,
        rolNombre: 'Gerente',
        empresaId: 1,
        esSistema: false,
        permisos: [buildPermiso()],
      };
      jest.spyOn(service, 'obtenerAcceso').mockResolvedValue(acceso);

      const result = await service.obtenerMisPermisos(10);

      expect(result).toHaveProperty('rolNombre', 'Gerente');
      expect(result).toHaveProperty('esSistema', false);
      expect(result.permisos).toBeDefined();
    });
  });

  describe('otorgarPermisosPorDefecto', () => {
    it('deberia ejecutar la query SQL en el entityManager provisto o en el default', async () => {
      const mockManager: any = { query: jest.fn().mockResolvedValue([]) };

      await service.otorgarPermisosPorDefecto(1, mockManager);

      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "permiso_modulos"'),
        expect.any(Array),
      );
    });
  });
});