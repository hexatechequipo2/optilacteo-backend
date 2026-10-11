import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from '../user.service';
import { USER_REPOSITORY } from '../repository/user-repository.interface';
import { User } from '../entities/user.entity';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { Rol } from '../../rol/entities/rol.entity';
import { RolService } from '../../rol/rol.service';
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildEmpresa(overrides: Partial<Empresa> = {}): Empresa {
  return { id: 1, name: 'Lacteos Norte', plan: 'starter' } as Empresa &
    typeof overrides;
}

function buildRol(overrides: Partial<Rol> = {}): Rol {
  return {
    id: 2,
    nombre: 'GERENTE',
    isActive: true,
    permisos: [],
    users: [],
    ...overrides,
  };
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
  };
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
  let mockRolService: { obtenerAsignable: jest.Mock };
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
    mockRolService = { obtenerAsignable: jest.fn() };
    mockEmpresaService = { getLimiteUsuarios: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        {
          provide: getRepositoryToken(Empresa),
          useValue: mockEmpresaTypeormRepo,
        },
        { provide: RolService, useValue: mockRolService },
        { provide: EmpresaService, useValue: mockEmpresaService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('create - alta de usuario (HU-07, HU-72 criterio 5)', () => {
    const preparar = (usuariosActuales = 1) => {
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(buildEmpresa());
      mockRolService.obtenerAsignable.mockResolvedValue(buildRol());
      mockEmpresaService.getLimiteUsuarios.mockResolvedValue(5);
      mockUserRepository.countByEmpresa.mockResolvedValue(usuariosActuales);
      mockUserRepository.createUser.mockResolvedValue(buildUser());
    };

    it('deberia crear el usuario con la contraseña hasheada, empresa y rol resueltos', async () => {
      preparar();

      const result = await service.create(buildCreateDto(), 1);

      expect(bcryptHash).toHaveBeenCalledWith('plainPassword123', 10);
      expect(mockUserRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'hash_generado_por_bcrypt' }),
      );
      expect(result.email).toBe('juan@lacteosnorte.com');
    });

    it('nunca deberia persistir la contraseña en texto plano', async () => {
      preparar(0);

      await service.create(buildCreateDto({ password: 'plainPassword123' }), 1);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const created = mockUserRepository.createUser.mock.calls[0][0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(created.password).not.toBe('plainPassword123');
    });

    it('opera sobre la empresa resuelta (no la del body) y valida el rol en esa empresa', async () => {
      preparar(0);

      await service.create(buildCreateDto({ empresaId: 99 }), 7);

      expect(mockEmpresaTypeormRepo.findOneBy).toHaveBeenCalledWith({ id: 7 });
      expect(mockRolService.obtenerAsignable).toHaveBeenCalledWith(2, 7);
      expect(mockEmpresaService.getLimiteUsuarios).toHaveBeenCalledWith(7);
      expect(mockUserRepository.countByEmpresa).toHaveBeenCalledWith(7);
    });

    it('lanza NotFoundException si la empresa no existe', async () => {
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(null);

      await expect(service.create(buildCreateDto(), 1)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUserRepository.createUser).not.toHaveBeenCalled();
    });

    it.each([
      ['no visible en la empresa', new NotFoundException('Rol no encontrado.')],
      [
        'Administrador',
        new ForbiddenException(
          'El rol Administrador no se puede asignar a usuarios de empresa.',
        ),
      ],
    ])('propaga el rechazo del rol (%s) sin crear', async (_caso, error) => {
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(buildEmpresa());
      mockRolService.obtenerAsignable.mockRejectedValue(error);

      await expect(service.create(buildCreateDto(), 1)).rejects.toThrow(error);
      expect(mockUserRepository.createUser).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si la empresa alcanzo el limite de usuarios de su plan', async () => {
      preparar(5);

      await expect(service.create(buildCreateDto(), 1)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserRepository.createUser).not.toHaveBeenCalled();
    });

    it('permite crear el usuario cuando esta justo debajo del limite (usuariosActuales < limite)', async () => {
      preparar(4);

      await expect(service.create(buildCreateDto(), 1)).resolves.toBeDefined();
      expect(mockUserRepository.createUser).toHaveBeenCalled();
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

      const result = await service.findAll(tenantAdministrador, query);

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

      await service.findAll(tenantGerente, query);

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
      await expect(service.findOne(999, tenantGerente)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve el usuario mapeado cuando existe y pertenece al tenant', async () => {
      mockUserRepository.findById.mockResolvedValue(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        buildUser({ empresa: { id: 1 } as any }),
      );
      const result = await service.findOne(10, tenantGerente);
      expect(result.id).toBe(10);
    });

    // TEST DE AISLAMIENTO (CP-08 / CP-09)
    it('lanza NotFoundException si el usuario existe pero pertenece a otra empresa', async () => {
      // El usuario encontrado es de la empresa 2, pero el tenant es de la empresa 1
      mockUserRepository.findById.mockResolvedValue(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        buildUser({ empresa: { id: 2 } as any }),
      );

      await expect(service.findOne(10, tenantGerente)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update - edicion de usuario', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.update(999, { name: 'x' }, 1)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el usuario es de otra empresa', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser());

      await expect(service.update(10, { name: 'x' }, 2)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    });

    it('deberia actualizar nombre y email y devolver el diff', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockUserRepository.updateUser.mockResolvedValue(
        buildUser({ name: 'Nuevo nombre', email: 'nuevo@lacteosnorte.com' }),
      );

      const r = await service.update(
        10,
        { name: 'Nuevo nombre', email: 'nuevo@lacteosnorte.com' },
        1,
      );

      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, {
        name: 'Nuevo nombre',
        email: 'nuevo@lacteosnorte.com',
      });
      expect(r.usuario.name).toBe('Nuevo nombre');
      expect(r.cambios.antes).toMatchObject({ name: 'Juan Pérez' });
      expect(r.cambios.despues).toMatchObject({ name: 'Nuevo nombre' });
      expect(JSON.stringify(r.cambios)).not.toContain('password');
    });

    it('deberia re-hashear la contraseña cuando el DTO trae una nueva', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockUserRepository.updateUser.mockResolvedValue(buildUser());

      await service.update(10, { password: 'nuevaPasswordSegura' }, 1);

      expect(bcryptHash).toHaveBeenCalledWith('nuevaPasswordSegura', 10);
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, {
        password: 'hash_generado_por_bcrypt',
      });
    });

    it('no deberia tocar la contraseña si el DTO no la trae', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockUserRepository.updateUser.mockResolvedValue(buildUser());

      await service.update(10, { name: 'Solo nombre' }, 1);

      expect(bcryptHash).not.toHaveBeenCalled();
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, {
        name: 'Solo nombre',
      });
    });

    it('empresaId del DTO no mueve al usuario de empresa', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockUserRepository.updateUser.mockResolvedValue(buildUser());

      await service.update(10, { empresaId: 1, name: 'x' }, 1);

      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, {
        name: 'x',
      });
    });
  });

  describe('activate / deactivate - HU-07', () => {
    it('deactivate deberia togglear isActive a false', async () => {
      mockUserRepository.findById.mockResolvedValue(
        buildUser({ isActive: true }),
      );
      mockUserRepository.updateUser.mockResolvedValue(
        buildUser({ isActive: false }),
      );

      // Agregamos tenantGerente como segundo argumento
      const result = await service.deactivate(10, tenantGerente);

      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, {
        isActive: false,
      });
      expect(result.isActive).toBe(false);
    });

    it('deactivate lanza NotFoundException si el usuario no existe', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      // Agregamos tenantGerente
      await expect(service.deactivate(999, tenantGerente)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('activate deberia togglear isActive a true', async () => {
      mockUserRepository.findById.mockResolvedValue(
        buildUser({ isActive: false }),
      );
      mockUserRepository.updateUser.mockResolvedValue(
        buildUser({ isActive: true }),
      );

      // Agregamos tenantGerente
      const result = await service.activate(10, tenantGerente);

      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, {
        isActive: true,
      });
      expect(result.isActive).toBe(true);
    });

    it('activate lanza NotFoundException si el usuario no existe', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      // Agregamos tenantGerente
      await expect(service.activate(999, tenantGerente)).rejects.toThrow(
        NotFoundException,
      );
    });

    describe('unlock', () => {
      it('deberia resetear los intentos fallidos y desbloquear al usuario', async () => {
        mockUserRepository.findById.mockResolvedValue(
          buildUser({ failedLoginAttempts: 5 }),
        );
        mockUserRepository.resetFailedAttempts.mockResolvedValue(undefined);

        // Agregamos tenantGerente
        await service.unlock(10, tenantGerente);

        expect(mockUserRepository.resetFailedAttempts).toHaveBeenCalledWith(10);
      });

      it('lanza NotFoundException si el usuario no existe', async () => {
        mockUserRepository.findById.mockResolvedValue(null);
        // Agregamos tenantGerente
        await expect(service.unlock(999, tenantGerente)).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });
});
