import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from '../user.service';
import { USER_REPOSITORY } from '../repository/user-repository.interface';
import { User } from '../entities/user.entity';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { Rol } from '../../rol/entities/rol.entity';
import { EmpresaService } from '../../empresa/empresa.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { ROLES } from '../../rol/constants/roles.constants';
import type { TenantContext } from '../../../common/types/tenant-context.type';

const tenantAdministrador: TenantContext = {
  empresaId: null,
  rolNombre: ROLES.ADMINISTRADOR,
};
const tenantGerente: TenantContext = {
  empresaId: 1,
  rolNombre: ROLES.GERENTE,
};

// Mock a nivel de modulo para evitar el problema con ESModules de bcrypt
// (mismo criterio que auth.service.spec.ts).
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));
import * as bcrypt from 'bcrypt';

const bcryptHash = bcrypt.hash as jest.Mock;

function buildEmpresa(overrides: Partial<Empresa> = {}): Empresa {
  return { id: 1, name: 'Lacteos Norte', plan: 'starter' } as Empresa & typeof overrides;
}

function buildRol(overrides: Partial<Rol> = {}): Rol {
  return { id: 2, nombre: 'GERENTE', isActive: true, permisos: [], ...overrides } as Rol;
}

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 10,
    name: 'Juan Pérez',
    email: 'juan@lacteosnorte.com',
    password: 'hash_seguro',
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    empresa: buildEmpresa(),
    rol: buildRol(),
    ...overrides,
  } as User;
}

function buildCreateDto(overrides: Partial<CreateUserDto> = {}): CreateUserDto {
  return {
    name: 'Juan Pérez',
    email: 'juan@lacteosnorte.com',
    password: 'plainPassword123',
    rolId: 2,
    empresaId: 1,
    ...overrides,
  };
}

describe('UserService', () => {
  let service: UserService;
  let mockUserRepository: {
    findByEmail: jest.Mock;
    findById: jest.Mock;
    findAll: jest.Mock;
    findAllPaginated: jest.Mock;
    createUser: jest.Mock;
    updateUser: jest.Mock;
    deleteUser: jest.Mock;
    updatePassword: jest.Mock;
    incrementFailedAttempts: jest.Mock;
    lockUser: jest.Mock;
    resetFailedAttempts: jest.Mock;
    countByEmpresa: jest.Mock;
  };
  let mockEmpresaTypeormRepo: { findOneBy: jest.Mock };
  let mockRolTypeormRepo: { findOneBy: jest.Mock };
  let mockEmpresaService: { getLimiteUsuarios: jest.Mock };

  beforeEach(async () => {
    bcryptHash.mockReset();
    bcryptHash.mockResolvedValue('hash_generado_por_bcrypt');

    mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findAllPaginated: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      updatePassword: jest.fn(),
      incrementFailedAttempts: jest.fn(),
      lockUser: jest.fn(),
      resetFailedAttempts: jest.fn(),
      countByEmpresa: jest.fn(),
    };
    mockEmpresaTypeormRepo = { findOneBy: jest.fn() };
    mockRolTypeormRepo = { findOneBy: jest.fn() };
    mockEmpresaService = { getLimiteUsuarios: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: getRepositoryToken(Empresa), useValue: mockEmpresaTypeormRepo },
        { provide: getRepositoryToken(Rol), useValue: mockRolTypeormRepo },
        { provide: EmpresaService, useValue: mockEmpresaService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('create - alta de usuario (HU-07)', () => {
    it('deberia crear el usuario con la contraseña hasheada, empresa y rol resueltos', async () => {
      const dto = buildCreateDto();
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(buildEmpresa());
      mockRolTypeormRepo.findOneBy.mockResolvedValue(buildRol());
      mockEmpresaService.getLimiteUsuarios.mockResolvedValue(5);
      mockUserRepository.countByEmpresa.mockResolvedValue(1);
      mockUserRepository.createUser.mockResolvedValue(buildUser());

      const result = await service.create(dto, tenantAdministrador);

      expect(bcryptHash).toHaveBeenCalledWith('plainPassword123', 10);
      expect(mockUserRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'hash_generado_por_bcrypt' }),
      );
      expect(result.email).toBe('juan@lacteosnorte.com');
    });

    it('nunca deberia persistir la contraseña en texto plano', async () => {
      const dto = buildCreateDto({ password: 'plainPassword123' });
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(buildEmpresa());
      mockRolTypeormRepo.findOneBy.mockResolvedValue(buildRol());
      mockEmpresaService.getLimiteUsuarios.mockResolvedValue(5);
      mockUserRepository.countByEmpresa.mockResolvedValue(0);
      mockUserRepository.createUser.mockResolvedValue(buildUser());

      await service.create(dto, tenantAdministrador);

      const created = mockUserRepository.createUser.mock.calls[0][0];
      expect(created.password).not.toBe('plainPassword123');
    });

    it('lanza NotFoundException si la empresa indicada no existe', async () => {
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(null);

      await expect(service.create(buildCreateDto(), tenantAdministrador)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUserRepository.createUser).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el rol indicado no existe', async () => {
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(buildEmpresa());
      mockRolTypeormRepo.findOneBy.mockResolvedValue(null);

      await expect(service.create(buildCreateDto(), tenantAdministrador)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUserRepository.createUser).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si la empresa alcanzo el limite de usuarios de su plan', async () => {
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(buildEmpresa());
      mockRolTypeormRepo.findOneBy.mockResolvedValue(buildRol());
      mockEmpresaService.getLimiteUsuarios.mockResolvedValue(5);
      mockUserRepository.countByEmpresa.mockResolvedValue(5);

      await expect(service.create(buildCreateDto(), tenantAdministrador)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserRepository.createUser).not.toHaveBeenCalled();
    });

    it('permite crear el usuario cuando esta justo debajo del limite (usuariosActuales < limite)', async () => {
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(buildEmpresa());
      mockRolTypeormRepo.findOneBy.mockResolvedValue(buildRol());
      mockEmpresaService.getLimiteUsuarios.mockResolvedValue(5);
      mockUserRepository.countByEmpresa.mockResolvedValue(4);
      mockUserRepository.createUser.mockResolvedValue(buildUser());

      await expect(service.create(buildCreateDto(), tenantAdministrador)).resolves.toBeDefined();
      expect(mockUserRepository.createUser).toHaveBeenCalled();
    });

    it('lanza ForbiddenException si un Gerente intenta asignar el rol Administrador', async () => {
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(buildEmpresa());
      mockRolTypeormRepo.findOneBy.mockResolvedValue(
        buildRol({ id: 9, nombre: ROLES.ADMINISTRADOR }),
      );

      await expect(
        service.create(buildCreateDto({ rolId: 9 }), tenantGerente),
      ).rejects.toThrow(ForbiddenException);
      expect(mockUserRepository.createUser).not.toHaveBeenCalled();
    });

    it('permite a un Gerente asignar un rol que no sea Administrador', async () => {
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(buildEmpresa());
      mockRolTypeormRepo.findOneBy.mockResolvedValue(buildRol({ nombre: ROLES.GERENTE }));
      mockEmpresaService.getLimiteUsuarios.mockResolvedValue(5);
      mockUserRepository.countByEmpresa.mockResolvedValue(0);
      mockUserRepository.createUser.mockResolvedValue(buildUser());

      await expect(service.create(buildCreateDto(), tenantGerente)).resolves.toBeDefined();
      expect(mockUserRepository.createUser).toHaveBeenCalled();
    });

    it('permite a un Gerente cambiar el rol a otro distinto de Administrador', async () => {
      const nuevoRol = buildRol({
        id: 3,
        nombre: ROLES.RESPONSABLE_CALIDAD,
      });

      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockRolTypeormRepo.findOneBy.mockResolvedValue(nuevoRol);
      mockUserRepository.updateUser.mockResolvedValue(
        buildUser({ rol: nuevoRol }),
      );

      await service.update(
        10,
        { rolId: 3 },
        tenantGerente,
      );

      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(
        10,
        { rol: nuevoRol },
      );
    });

    it('ignora el empresaId del body y fuerza el de su propio tenant cuando quien crea es Gerente', async () => {
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(buildEmpresa());
      mockRolTypeormRepo.findOneBy.mockResolvedValue(buildRol({ nombre: ROLES.GERENTE }));
      mockEmpresaService.getLimiteUsuarios.mockResolvedValue(5);
      mockUserRepository.countByEmpresa.mockResolvedValue(0);
      mockUserRepository.createUser.mockResolvedValue(buildUser());

      // tenantGerente.empresaId es 1, pero el body intenta crear en la empresa 99
      await service.create(buildCreateDto({ empresaId: 99 }), tenantGerente);

      expect(mockEmpresaTypeormRepo.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockEmpresaService.getLimiteUsuarios).toHaveBeenCalledWith(1);
      expect(mockUserRepository.countByEmpresa).toHaveBeenCalledWith(1);
    });

    it('respeta el empresaId del body cuando quien crea es Administrador', async () => {
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(buildEmpresa({ id: 7 } as never));
      mockRolTypeormRepo.findOneBy.mockResolvedValue(buildRol());
      mockEmpresaService.getLimiteUsuarios.mockResolvedValue(5);
      mockUserRepository.countByEmpresa.mockResolvedValue(0);
      mockUserRepository.createUser.mockResolvedValue(buildUser());

      await service.create(buildCreateDto({ empresaId: 7 }), tenantAdministrador);

      expect(mockEmpresaTypeormRepo.findOneBy).toHaveBeenCalledWith({ id: 7 });
      expect(mockEmpresaService.getLimiteUsuarios).toHaveBeenCalledWith(7);
      expect(mockUserRepository.countByEmpresa).toHaveBeenCalledWith(7);
    });

    it('lanza ForbiddenException si un tenant sin empresa asociada intenta crear un usuario', async () => {
      const tenantSinEmpresa: TenantContext = { empresaId: null, rolNombre: ROLES.GERENTE };

      await expect(service.create(buildCreateDto(), tenantSinEmpresa)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockUserRepository.createUser).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('deberia devolver la lista paginada de usuarios mapeada, reflejando el estado activo/inactivo de cada uno', async () => {
      const query = {
        page: 1,
        limit: 20,
      };

      mockUserRepository.findAllPaginated.mockResolvedValue([
        [
          buildUser({ id: 1, isActive: true }),
          buildUser({ id: 2, isActive: false }),
        ],
        2,
      ]);

      const result = await service.findAll(
        tenantAdministrador,
        query,
      );

      expect(mockUserRepository.findAllPaginated).toHaveBeenCalledWith(
        tenantAdministrador,
        0,
        20,
        {},
      );

      expect(result.data).toHaveLength(2);
      expect(result.data[0].isActive).toBe(true);
      expect(result.data[1].isActive).toBe(false);

      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    // CP-08
    it('deberia delegar el tenant en el repository para que aplique el scoping por empresa', async () => {
      const query = {
        page: 1,
        limit: 20,
      };

      mockUserRepository.findAllPaginated.mockResolvedValue([[], 0]);

      await service.findAll(
        tenantGerente,
        query,
      );

      expect(mockUserRepository.findAllPaginated).toHaveBeenCalledWith(
        tenantGerente,
        0,
        20,
        {},
      );
    });
  });

 describe('findOne', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      await expect(service.findOne(999, tenantGerente)).rejects.toThrow(NotFoundException);
    });

    it('devuelve el usuario mapeado cuando existe y pertenece al tenant', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser({ empresa: { id: 1 } as any }));
      const result = await service.findOne(10, tenantGerente);
      expect(result.id).toBe(10);
    });

    // TEST DE AISLAMIENTO (CP-08 / CP-09)
    it('lanza NotFoundException si el usuario existe pero pertenece a otra empresa', async () => {
      // El usuario encontrado es de la empresa 2, pero el tenant es de la empresa 1
      mockUserRepository.findById.mockResolvedValue(buildUser({ empresa: { id: 2 } as any }));
      
      await expect(service.findOne(10, tenantGerente)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update - edicion de usuario', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.update(999, { name: 'x' }, tenantAdministrador)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    });

    it('deberia actualizar nombre y email cuando vienen en el DTO', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockUserRepository.updateUser.mockResolvedValue(buildUser({ name: 'Nuevo nombre' }));

      await service.update(
        10,
        { name: 'Nuevo nombre', email: 'nuevo@lacteosnorte.com' },
        tenantAdministrador,
      );

      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, {
        name: 'Nuevo nombre',
        email: 'nuevo@lacteosnorte.com',
      });
    });

    it('deberia re-hashear la contraseña cuando el DTO trae una nueva', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockUserRepository.updateUser.mockResolvedValue(buildUser());

      await service.update(10, { password: 'nuevaPasswordSegura' }, tenantAdministrador);

      expect(bcryptHash).toHaveBeenCalledWith('nuevaPasswordSegura', 10);
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, {
        password: 'hash_generado_por_bcrypt',
      });
    });

    it('no deberia tocar la contraseña si el DTO no la trae', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockUserRepository.updateUser.mockResolvedValue(buildUser());

      await service.update(10, { name: 'Solo nombre' }, tenantAdministrador);

      expect(bcryptHash).not.toHaveBeenCalled();
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, { name: 'Solo nombre' });
    });

    it('deberia cambiar el rol del usuario resolviendolo por rolId', async () => {
      const nuevoRol = buildRol({ id: 3, nombre: ROLES.ADMINISTRADOR });
      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockRolTypeormRepo.findOneBy.mockResolvedValue(nuevoRol);
      mockUserRepository.updateUser.mockResolvedValue(buildUser({ rol: nuevoRol }));

      await service.update(10, { rolId: 3 }, tenantAdministrador);

      expect(mockRolTypeormRepo.findOneBy).toHaveBeenCalledWith({ id: 3 });
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, { rol: nuevoRol });
    });

    it('lanza NotFoundException si el nuevo rol no existe', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockRolTypeormRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.update(10, { rolId: 999 }, tenantAdministrador),
      ).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    });

    it('deberia cambiar la empresa del usuario resolviendola por empresaId', async () => {
      const nuevaEmpresa = buildEmpresa({ id: 2, name: 'Lacteos Sur' } as never);
      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(nuevaEmpresa);
      mockUserRepository.updateUser.mockResolvedValue(buildUser({ empresa: nuevaEmpresa }));

      await service.update(10, { empresaId: 2 }, tenantAdministrador);

      expect(mockEmpresaTypeormRepo.findOneBy).toHaveBeenCalledWith({ id: 2 });
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, { empresa: nuevaEmpresa });
    });

    it('lanza NotFoundException si la nueva empresa no existe', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.update(10, { empresaId: 999 }, tenantAdministrador),
      ).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    });

    it('lanza ForbiddenException si un Gerente intenta reasignar el rol Administrador a un usuario existente', async () => {
      const rolAdministrador = buildRol({ id: 9, nombre: ROLES.ADMINISTRADOR });
      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockRolTypeormRepo.findOneBy.mockResolvedValue(rolAdministrador);

      await expect(
        service.update(10, { rolId: 9 }, tenantGerente),
      ).rejects.toThrow(ForbiddenException);
      expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    });
  });

  describe('activate / deactivate - HU-07', () => {
    it('deactivate deberia togglear isActive a false', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser({ isActive: true }));
      mockUserRepository.updateUser.mockResolvedValue(buildUser({ isActive: false }));

      // Agregamos tenantGerente como segundo argumento
      const result = await service.deactivate(10, tenantGerente);

      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, { isActive: false });
      expect(result.isActive).toBe(false);
    });

    it('deactivate lanza NotFoundException si el usuario no existe', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      // Agregamos tenantGerente
      await expect(service.deactivate(999, tenantGerente)).rejects.toThrow(NotFoundException);
    });

    it('activate deberia togglear isActive a true', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser({ isActive: false }));
      mockUserRepository.updateUser.mockResolvedValue(buildUser({ isActive: true }));

      // Agregamos tenantGerente
      const result = await service.activate(10, tenantGerente);

      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, { isActive: true });
      expect(result.isActive).toBe(true);
    });

    it('activate lanza NotFoundException si el usuario no existe', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      // Agregamos tenantGerente
      await expect(service.activate(999, tenantGerente)).rejects.toThrow(NotFoundException);
    });

    describe('unlock', () => {
      it('deberia resetear los intentos fallidos y desbloquear al usuario', async () => {
        mockUserRepository.findById.mockResolvedValue(buildUser({ failedLoginAttempts: 5 }));
        mockUserRepository.resetFailedAttempts.mockResolvedValue(undefined);

        // Agregamos tenantGerente
        await service.unlock(10, tenantGerente);

        expect(mockUserRepository.resetFailedAttempts).toHaveBeenCalledWith(10);
      });

      it('lanza NotFoundException si el usuario no existe', async () => {
        mockUserRepository.findById.mockResolvedValue(null);
        // Agregamos tenantGerente
        await expect(service.unlock(999, tenantGerente)).rejects.toThrow(NotFoundException);
      });
    });
  });
});