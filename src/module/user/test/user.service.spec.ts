import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from '../user.service';
import { USER_REPOSITORY } from '../repository/user-repository.interface';
import { User } from '../entities/user.entity';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { Rol } from '../../rol/entities/rol.entity';
import { EmpresaService } from '../../empresa/empresa.service';
import { CreateUserDto } from '../dto/create-user.dto';

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

      const result = await service.create(dto);

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

      await service.create(dto);

      const created = mockUserRepository.createUser.mock.calls[0][0];
      expect(created.password).not.toBe('plainPassword123');
    });

    it('lanza NotFoundException si la empresa indicada no existe', async () => {
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(null);

      await expect(service.create(buildCreateDto())).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.createUser).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el rol indicado no existe', async () => {
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(buildEmpresa());
      mockRolTypeormRepo.findOneBy.mockResolvedValue(null);

      await expect(service.create(buildCreateDto())).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.createUser).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si la empresa alcanzo el limite de usuarios de su plan', async () => {
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(buildEmpresa());
      mockRolTypeormRepo.findOneBy.mockResolvedValue(buildRol());
      mockEmpresaService.getLimiteUsuarios.mockResolvedValue(5);
      mockUserRepository.countByEmpresa.mockResolvedValue(5);

      await expect(service.create(buildCreateDto())).rejects.toThrow(BadRequestException);
      expect(mockUserRepository.createUser).not.toHaveBeenCalled();
    });

    it('permite crear el usuario cuando esta justo debajo del limite (usuariosActuales < limite)', async () => {
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(buildEmpresa());
      mockRolTypeormRepo.findOneBy.mockResolvedValue(buildRol());
      mockEmpresaService.getLimiteUsuarios.mockResolvedValue(5);
      mockUserRepository.countByEmpresa.mockResolvedValue(4);
      mockUserRepository.createUser.mockResolvedValue(buildUser());

      await expect(service.create(buildCreateDto())).resolves.toBeDefined();
      expect(mockUserRepository.createUser).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('deberia devolver la lista de usuarios mapeada, reflejando el estado activo/inactivo de cada uno', async () => {
      mockUserRepository.findAll.mockResolvedValue([
        buildUser({ id: 1, isActive: true }),
        buildUser({ id: 2, isActive: false }),
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].isActive).toBe(true);
      expect(result[1].isActive).toBe(false);
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('devuelve el usuario mapeado cuando existe', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser());

      const result = await service.findOne(10);

      expect(result.id).toBe(10);
    });
  });

  describe('update - edicion de usuario', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.update(999, { name: 'x' })).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    });

    it('deberia actualizar nombre y email cuando vienen en el DTO', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockUserRepository.updateUser.mockResolvedValue(buildUser({ name: 'Nuevo nombre' }));

      await service.update(10, { name: 'Nuevo nombre', email: 'nuevo@lacteosnorte.com' });

      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, {
        name: 'Nuevo nombre',
        email: 'nuevo@lacteosnorte.com',
      });
    });

    it('deberia re-hashear la contraseña cuando el DTO trae una nueva', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockUserRepository.updateUser.mockResolvedValue(buildUser());

      await service.update(10, { password: 'nuevaPasswordSegura' });

      expect(bcryptHash).toHaveBeenCalledWith('nuevaPasswordSegura', 10);
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, {
        password: 'hash_generado_por_bcrypt',
      });
    });

    it('no deberia tocar la contraseña si el DTO no la trae', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockUserRepository.updateUser.mockResolvedValue(buildUser());

      await service.update(10, { name: 'Solo nombre' });

      expect(bcryptHash).not.toHaveBeenCalled();
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, { name: 'Solo nombre' });
    });

    it('deberia cambiar el rol del usuario resolviendolo por rolId', async () => {
      const nuevoRol = buildRol({ id: 3, nombre: 'ADMINISTRADOR' });
      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockRolTypeormRepo.findOneBy.mockResolvedValue(nuevoRol);
      mockUserRepository.updateUser.mockResolvedValue(buildUser({ rol: nuevoRol }));

      await service.update(10, { rolId: 3 });

      expect(mockRolTypeormRepo.findOneBy).toHaveBeenCalledWith({ id: 3 });
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, { rol: nuevoRol });
    });

    it('lanza NotFoundException si el nuevo rol no existe', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockRolTypeormRepo.findOneBy.mockResolvedValue(null);

      await expect(service.update(10, { rolId: 999 })).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    });

    it('deberia cambiar la empresa del usuario resolviendola por empresaId', async () => {
      const nuevaEmpresa = buildEmpresa({ id: 2, name: 'Lacteos Sur' } as never);
      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(nuevaEmpresa);
      mockUserRepository.updateUser.mockResolvedValue(buildUser({ empresa: nuevaEmpresa }));

      await service.update(10, { empresaId: 2 });

      expect(mockEmpresaTypeormRepo.findOneBy).toHaveBeenCalledWith({ id: 2 });
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, { empresa: nuevaEmpresa });
    });

    it('lanza NotFoundException si la nueva empresa no existe', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser());
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(null);

      await expect(service.update(10, { empresaId: 999 })).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    });
  });

  describe('activate / deactivate - HU-07', () => {
    it('deactivate deberia togglear isActive a false sin borrar al usuario (conserva su historial)', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser({ isActive: true }));
      mockUserRepository.updateUser.mockResolvedValue(buildUser({ isActive: false }));

      const result = await service.deactivate(10);

      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, { isActive: false });
      expect(mockUserRepository.deleteUser).not.toHaveBeenCalled();
      expect(result.isActive).toBe(false);
    });

    it('deactivate lanza NotFoundException si el usuario no existe', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.deactivate(999)).rejects.toThrow(NotFoundException);
    });

    it('activate deberia togglear isActive a true', async () => {
      mockUserRepository.findById.mockResolvedValue(buildUser({ isActive: false }));
      mockUserRepository.updateUser.mockResolvedValue(buildUser({ isActive: true }));

      const result = await service.activate(10);

      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(10, { isActive: true });
      expect(result.isActive).toBe(true);
    });

    it('activate lanza NotFoundException si el usuario no existe', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.activate(999)).rejects.toThrow(NotFoundException);
    });
  });
});
