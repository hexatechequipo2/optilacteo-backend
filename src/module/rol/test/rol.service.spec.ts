// module/rol/test/rol.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RolService } from '../rol.service';
import { Rol } from '../entities/rol.entity';
import { PermisoModulo } from '../../permiso/entities/permiso-modulo.entity';
import { ModuloAdministrativo } from '../../permiso/enums/modulo-administrativo.enum';
import { User } from '../../user/entities/user.entity';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

describe('RolService', () => {
  let service: RolService;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getExists: jest.fn(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockRolRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockPermisoRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockEntityManager = {
    save: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    query: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockUserRepository = {
    count: jest.fn(),
    findOne: jest.fn(),
  };

  const mockDataSource = {
    query: jest.fn(),
    transaction: jest.fn((cb) => cb(mockEntityManager)),
    getRepository: jest.fn().mockImplementation((entity) => {
      if (entity === User) return mockUserRepository;
      return mockRolRepo;
    }),
  };

  const actorBase: AuthenticatedUser = {
    id: 1,
    empresaId: 100,
    rolId: 10,
    esSistema: false,
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: getRepositoryToken(Rol), useValue: mockRolRepo },
        { provide: getRepositoryToken(PermisoModulo), useValue: mockPermisoRepo },
      ],
    }).compile();

    service = module.get<RolService>(RolService);
  });

  afterEach(() => jest.clearAllMocks());

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('listar', () => {
    it('debe retornar la lista de roles con conteo de usuarios y sus permisos', async () => {
      // Arrange
      const empresaId = 100;
      const rolesMock = [
        { id: 1, nombre: 'ADMIN', descripcion: 'Admin', esSistema: true, empresa: null },
      ];
      const permisosMock = [
        {
          id: 1,
          modulo: ModuloAdministrativo.GESTION_ROLES,
          canRead: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
          canExport: true,
          rol: { id: 1 },
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(rolesMock);
      mockPermisoRepo.find.mockResolvedValue(permisosMock);
      mockDataSource.query.mockResolvedValue([{ rolId: 1, n: 3 }]);

      // Act
      const resultado = await service.listar(empresaId);

      // Assert
      expect(resultado).toHaveLength(1);
      expect(resultado[0].usuarios).toBe(3);
      expect(resultado[0].esCatalogo).toBe(true);
      expect(resultado[0].permisos).toHaveLength(1);
    });
  });

  describe('crear', () => {
    const empresaId = 100;
    const dto = {
      nombre: 'NUEVO_ROL',
      descripcion: 'Nuevo',
      permisos: [
        {
          modulo: ModuloAdministrativo.GESTION_ROLES,
          canRead: true,
          canCreate: true,
          canUpdate: false,
          canDelete: false,
          canExport: false,
        },
      ],
    } as any;

    it('debe crear un rol correctamente dentro de una transacción', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([
        { modulo: ModuloAdministrativo.GESTION_ROLES },
      ]);
      mockQueryBuilder.getExists.mockResolvedValue(false);
      mockEntityManager.save.mockResolvedValue({ id: 5, nombre: dto.nombre });

      // Act
      const resultado = await service.crear(empresaId, dto);

      // Assert
      expect(resultado.id).toBe(5);
      expect(mockEntityManager.save).toHaveBeenCalled();
      expect(mockEntityManager.insert).toHaveBeenCalled();
    });

    it('debe lanzar ForbiddenException si el DTO incluye un módulo no contratado', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]); // Módulos contratados por la empresa: ninguno

      const dtoInvalido = {
        ...dto,
        permisos: [
          {
            modulo: 'MODULO_NO_EXISTENTE_Y_NO_OTORGABLE' as any,
            canRead: true,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
            canExport: false,
          },
        ],
      };

      // Act & Assert
      await expect(service.crear(empresaId, dtoInvalido)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debe lanzar ConflictException si el nombre ya está registrado', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([
        { modulo: ModuloAdministrativo.GESTION_ROLES },
      ]);
      mockQueryBuilder.getExists.mockResolvedValue(true);

      // Act & Assert
      await expect(service.crear(empresaId, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('actualizar', () => {
    const rolId = 2;
    const empresaId = 100;
    const dto = {
      nombre: 'ROL_MODIFICADO',
      descripcion: 'Desc',
      permisos: [
        {
          modulo: ModuloAdministrativo.GESTION_ROLES,
          canRead: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
          canExport: true,
        },
      ],
    } as any;

    it('debe actualizar el rol y sus permisos exitosamente', async () => {
      // Arrange
      const rolViejo = { id: rolId, nombre: 'ROL_VIEJO', esSistema: false, empresa: { id: empresaId } };
      mockQueryBuilder.getOne.mockResolvedValue(rolViejo);
      mockQueryBuilder.getExists.mockResolvedValue(false);
      mockDataSource.query.mockResolvedValue([
        { modulo: ModuloAdministrativo.GESTION_ROLES },
      ]);
      mockPermisoRepo.find.mockResolvedValue([]);
      mockEntityManager.query.mockResolvedValue([{ n: 1 }]); // Para exigirGestor

      // Act
      const resultado = await service.actualizar(rolId, empresaId, dto, actorBase);

      // Assert
      expect(resultado.id).toBe(rolId);
      expect(resultado.nombre).toBe(dto.nombre);
      expect(mockEntityManager.update).toHaveBeenCalled();
    });

    it('debe lanzar ConflictException cuando el rol a modificar es de sistema', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue({ id: rolId, esSistema: true, empresa: null });

      // Act & Assert
      await expect(
        service.actualizar(rolId, empresaId, dto, actorBase),
      ).rejects.toThrow(
        'El rol Administrador tiene acceso total y no se puede modificar.',
      );
    });

    it('debe lanzar ConflictException cuando un rol de catálogo intenta ser renombrado', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue({ id: rolId, esSistema: false, empresa: null, nombre: 'CATALOGO_VIEJO' });

      // Act & Assert
      await expect(
        service.actualizar(rolId, empresaId, dto, actorBase),
      ).rejects.toThrow('Un rol del catálogo no se puede renombrar.');
    });

    it('cuando el nuevo nombre ya existe, debe lanzar ConflictException', async () => {
      // Arrange
      const rolExistente = { id: rolId, nombre: 'ROL_VIEJO', esSistema: false, empresa: { id: empresaId } };
      mockQueryBuilder.getOne.mockResolvedValue(rolExistente);
      mockQueryBuilder.getExists.mockResolvedValue(true);

      // Act & Assert
      await expect(
        service.actualizar(rolId, empresaId, dto, actorBase),
      ).rejects.toThrow('Ya existe un rol con ese nombre.');
    });

    it('debe lanzar ConflictException si el usuario intenta quitarse su propio permiso de gestión de roles', async () => {
      // Arrange
      const miRolId = actorBase.rolId!;
      const dtoSinGestion = {
        nombre: 'ROL_VIEJO',
        permisos: [
          {
            modulo: ModuloAdministrativo.GESTION_ROLES,
            canRead: false,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
            canExport: false,
          },
        ],
      } as any;

      mockQueryBuilder.getOne.mockResolvedValue({ id: miRolId, nombre: 'ROL_VIEJO', esSistema: false, empresa: { id: empresaId } });
      mockDataSource.query.mockResolvedValue([
        { modulo: ModuloAdministrativo.GESTION_ROLES },
      ]);

      // Act & Assert
      await expect(
        service.actualizar(miRolId, empresaId, dtoSinGestion, actorBase),
      ).rejects.toThrow('No podés quitarte el permiso de gestionar roles.');
    });
  });

  describe('eliminar', () => {
    const rolId = 3;
    const empresaId = 100;

    it('debe eliminar un rol sin usuarios asignados', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue({ id: rolId, nombre: 'ROL_BORRABLE', esSistema: false, empresa: { id: empresaId } });
      mockUserRepository.count.mockResolvedValue(0);
      mockPermisoRepo.find.mockResolvedValue([]);

      // Act
      const resultado = await service.eliminar(rolId, empresaId);

      // Assert
      expect(resultado.id).toBe(rolId);
      expect(mockEntityManager.delete).toHaveBeenCalledWith(Rol, rolId);
    });

    it('debe lanzar ConflictException si el rol pertenece al sistema', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue({ id: rolId, esSistema: true });

      // Act & Assert
      await expect(service.eliminar(rolId, empresaId)).rejects.toThrow(
        'No se puede eliminar el rol Administrador.',
      );
    });

    it('debe lanzar ConflictException si el rol pertenece al catálogo global', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue({ id: rolId, esSistema: false, empresa: null });

      // Act & Assert
      await expect(service.eliminar(rolId, empresaId)).rejects.toThrow(
        'Los roles del catálogo no se pueden eliminar.',
      );
    });

    it('debe lanzar ConflictException si el rol tiene usuarios asignados', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue({ id: rolId, esSistema: false, empresa: { id: empresaId } });
      mockUserRepository.count.mockResolvedValue(2);

      // Act & Assert
      await expect(service.eliminar(rolId, empresaId)).rejects.toThrow(
        'El rol tiene 2 usuario(s) asignado(s). Reasignalos antes de eliminarlo.',
      );
    });
  });

  describe('asignarRol', () => {
    const usuarioId = 1;
    const nuevoRolId = 5;
    const empresaId = 100;

    it('debe reasignar el rol a un usuario exitosamente', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({
        id: usuarioId,
        rol: { nombre: 'ROL_VIEJO', esSistema: false },
      });
      mockQueryBuilder.getOne.mockResolvedValue({
        id: nuevoRolId,
        nombre: 'ROL_NUEVO',
        esSistema: false,
        isActive: true,
      });

      // Permiso para autobloqueo
      mockPermisoRepo.findOne.mockResolvedValue({
        modulo: ModuloAdministrativo.GESTION_ROLES,
        canRead: true,
        canUpdate: true,
      });

      // Para exigirGestor dentro de la transacción
      mockEntityManager.query.mockResolvedValue([{ n: 1 }]);

      // Act
      const resultado = await service.asignarRol(usuarioId, nuevoRolId, empresaId, actorBase);

      // Assert
      expect(resultado.usuarioId).toBe(usuarioId);
      expect(resultado.rolNuevo).toBe('ROL_NUEVO');
      expect(mockEntityManager.update).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.asignarRol(usuarioId, nuevoRolId, empresaId, actorBase),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ForbiddenException si un usuario normal intenta alterar a un usuario de sistema', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue({ id: usuarioId, rol: { esSistema: true } });

      // Act & Assert
      await expect(
        service.asignarRol(usuarioId, nuevoRolId, empresaId, actorBase),
      ).rejects.toThrow('No podés asignar ni cambiar un rol de sistema.');
    });
  });
});