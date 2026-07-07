import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolService } from '../rol.service';
import { ROL_REPOSITORY } from '../repository/rol-interface.repository';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { User } from '../../user/entities/user.entity';
import { Rol } from '../entities/rol.entity';
import { CreateRolDto } from '../dto/create-rol.dto';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';

function buildEmpresa(overrides: Partial<Empresa> = {}): Empresa {
  return { id: 1, name: 'Lacteos Norte', ...overrides } as Empresa;
}

function buildRol(overrides: Partial<Rol> = {}): Rol {
  return {
    id: 5,
    nombre: 'Supervisor de calidad',
    descripcion: 'Accede a módulos de calidad y reportes',
    isActive: true,
    empresa: buildEmpresa(),
    permisos: [],
    ...overrides,
  } as Rol;
}

function buildCreateDto(overrides: Partial<CreateRolDto> = {}): CreateRolDto {
  return {
    nombre: 'Supervisor de calidad',
    descripcion: 'Accede a módulos de calidad y reportes',
    empresaId: 1,
    ...overrides,
  };
}

describe('RolService', () => {
  let service: RolService;
  let mockRolRepository: {
    findById: jest.Mock;
    findAll: jest.Mock;
    findByEmpresa: jest.Mock;
    createRol: jest.Mock;
    updateRol: jest.Mock;
    deleteRol: jest.Mock;
    hasActiveUsers: jest.Mock;
    createPermisos: jest.Mock;
    findPermiso: jest.Mock;
    updatePermiso: jest.Mock;
  };
  let mockEmpresaTypeormRepo: { findOneBy: jest.Mock };
  let mockUserTypeormRepo: { count: jest.Mock };

  beforeEach(async () => {
    mockRolRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByEmpresa: jest.fn(),
      createRol: jest.fn(),
      updateRol: jest.fn(),
      deleteRol: jest.fn(),
      hasActiveUsers: jest.fn(),
      createPermisos: jest.fn(),
      findPermiso: jest.fn(),
      updatePermiso: jest.fn(),
    };
    mockEmpresaTypeormRepo = { findOneBy: jest.fn() };
    mockUserTypeormRepo = { count: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolService,
        { provide: ROL_REPOSITORY, useValue: mockRolRepository },
        { provide: getRepositoryToken(Empresa), useValue: mockEmpresaTypeormRepo },
        { provide: getRepositoryToken(User), useValue: mockUserTypeormRepo },
      ],
    }).compile();

    service = module.get<RolService>(RolService);
  });

  describe('create - alta de rol (HU-02)', () => {
    it('deberia crear el rol con nombre y descripcion, resolviendo la empresa', async () => {
      const dto = buildCreateDto();
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(buildEmpresa());
      mockRolRepository.createRol.mockResolvedValue(buildRol());
      mockRolRepository.findById.mockResolvedValue(buildRol());

      const result = await service.create(dto);

      expect(mockEmpresaTypeormRepo.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockRolRepository.createRol).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Supervisor de calidad', descripcion: dto.descripcion }),
      );
      expect(result.nombre).toBe('Supervisor de calidad');
    });

    it('lanza NotFoundException si la empresa indicada no existe', async () => {
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(null);

      await expect(service.create(buildCreateDto())).rejects.toThrow(NotFoundException);
      expect(mockRolRepository.createRol).not.toHaveBeenCalled();
    });

    it('deberia auto-asignar los permisos default cuando el nombre coincide con un rol predefinido (Gerente)', async () => {
      const dto = buildCreateDto({ nombre: 'Gerente' });
      const createdRol = buildRol({ nombre: 'Gerente' });
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(buildEmpresa());
      mockRolRepository.createRol.mockResolvedValue(createdRol);
      mockRolRepository.findById.mockResolvedValue(createdRol);

      await service.create(dto);

      expect(mockRolRepository.createPermisos).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            modulo: ModuloSistema.DASHBOARD,
            canRead: true,
            canWrite: false,
            rol: createdRol,
          }),
        ]),
      );
    });

    it('no deberia asignar permisos default cuando el nombre no coincide con ningun rol predefinido', async () => {
      const dto = buildCreateDto({ nombre: 'Rol Custom Sin Preset' });
      const createdRol = buildRol({ nombre: 'Rol Custom Sin Preset' });
      mockEmpresaTypeormRepo.findOneBy.mockResolvedValue(buildEmpresa());
      mockRolRepository.createRol.mockResolvedValue(createdRol);
      mockRolRepository.findById.mockResolvedValue(createdRol);

      await service.create(dto);

      expect(mockRolRepository.createPermisos).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('deberia devolver la lista de roles mapeada', async () => {
      mockRolRepository.findAll.mockResolvedValue([buildRol({ id: 1 }), buildRol({ id: 2 })]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
    });
  });

  describe('findByEmpresa', () => {
    it('deberia delegar en rolRepository.findByEmpresa con el id recibido', async () => {
      mockRolRepository.findByEmpresa.mockResolvedValue([buildRol()]);

      await service.findByEmpresa(1);

      expect(mockRolRepository.findByEmpresa).toHaveBeenCalledWith(1);
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el rol no existe', async () => {
      mockRolRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('devuelve el rol mapeado cuando existe', async () => {
      mockRolRepository.findById.mockResolvedValue(buildRol());

      const result = await service.findOne(5);

      expect(result.id).toBe(5);
    });
  });

  describe('update - edicion de rol existente', () => {
    it('lanza NotFoundException si el rol no existe', async () => {
      mockRolRepository.findById.mockResolvedValue(null);

      await expect(service.update(999, { nombre: 'x' })).rejects.toThrow(NotFoundException);
      expect(mockRolRepository.updateRol).not.toHaveBeenCalled();
    });

    it('deberia actualizar nombre y descripcion cuando vienen en el DTO', async () => {
      mockRolRepository.findById.mockResolvedValue(buildRol());
      mockRolRepository.updateRol.mockResolvedValue(buildRol({ nombre: 'Nuevo nombre' }));

      await service.update(5, { nombre: 'Nuevo nombre', descripcion: 'Nueva descripcion' });

      expect(mockRolRepository.updateRol).toHaveBeenCalledWith(5, {
        nombre: 'Nuevo nombre',
        descripcion: 'Nueva descripcion',
      });
    });

    it('no deberia enviar campos que no vienen en el DTO', async () => {
      mockRolRepository.findById.mockResolvedValue(buildRol());
      mockRolRepository.updateRol.mockResolvedValue(buildRol());

      await service.update(5, { nombre: 'Solo nombre' });

      expect(mockRolRepository.updateRol).toHaveBeenCalledWith(5, { nombre: 'Solo nombre' });
    });
  });

  describe('remove - HU-02 punto 4: no eliminar rol con usuarios activos', () => {
    it('lanza NotFoundException si el rol no existe', async () => {
      mockRolRepository.findById.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(mockUserTypeormRepo.count).not.toHaveBeenCalled();
    });

    it('lanza ConflictException si el rol tiene usuarios activos asignados', async () => {
      mockRolRepository.findById.mockResolvedValue(buildRol());
      mockUserTypeormRepo.count.mockResolvedValue(2);

      await expect(service.remove(5)).rejects.toThrow(ConflictException);
      expect(mockUserTypeormRepo.count).toHaveBeenCalledWith({
        where: { rol: { id: 5 }, isActive: true },
      });
      expect(mockRolRepository.deleteRol).not.toHaveBeenCalled();
    });

    it('elimina el rol cuando no tiene usuarios activos asignados', async () => {
      mockRolRepository.findById.mockResolvedValue(buildRol());
      mockUserTypeormRepo.count.mockResolvedValue(0);

      const result = await service.remove(5);

      expect(mockRolRepository.deleteRol).toHaveBeenCalledWith(5);
      expect(result).toEqual({ message: 'Rol con id 5 eliminado correctamente' });
    });

    it('el conteo de usuarios activos ignora a los usuarios inactivos con ese rol (isActive:true en el filtro)', async () => {
      mockRolRepository.findById.mockResolvedValue(buildRol());
      mockUserTypeormRepo.count.mockResolvedValue(0);

      await service.remove(5);

      expect(mockUserTypeormRepo.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
      );
    });
  });

  describe('updatePermiso - asignar/actualizar permisos por modulo (persistencia)', () => {
    it('lanza NotFoundException si el rol no existe', async () => {
      mockRolRepository.findById.mockResolvedValue(null);

      await expect(
        service.updatePermiso(999, { modulo: ModuloSistema.DASHBOARD, canRead: true, canWrite: false }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deberia crear el permiso si el rol no tiene uno para ese modulo todavia (asignar)', async () => {
      const rol = buildRol();
      // updatePermiso() llama a findById tres veces en esta rama: findOne()
      // inicial, resolver el rol para armar el permiso nuevo, y recargar al final.
      mockRolRepository.findById.mockResolvedValue(rol);
      mockRolRepository.findPermiso.mockResolvedValue(null);

      await service.updatePermiso(5, {
        modulo: ModuloSistema.SENSORES_IOT,
        canRead: true,
        canWrite: false,
      });

      expect(mockRolRepository.createPermisos).toHaveBeenCalledWith([
        { modulo: ModuloSistema.SENSORES_IOT, canRead: true, canWrite: false, rol },
      ]);
      expect(mockRolRepository.updatePermiso).not.toHaveBeenCalled();
    });

    it('deberia actualizar el permiso existente para ese modulo (editar permisos de un rol existente)', async () => {
      const rol = buildRol();
      const permisoExistente = { id: 7, modulo: ModuloSistema.DASHBOARD, canRead: true, canWrite: false };
      mockRolRepository.findById.mockResolvedValue(rol);
      mockRolRepository.findPermiso.mockResolvedValue(permisoExistente);

      await service.updatePermiso(5, {
        modulo: ModuloSistema.DASHBOARD,
        canRead: true,
        canWrite: true,
      });

      expect(mockRolRepository.updatePermiso).toHaveBeenCalledWith(7, true, true);
      expect(mockRolRepository.createPermisos).not.toHaveBeenCalled();
    });

    it('desasignar un permiso significa poner canRead y canWrite en false (no se borra la fila)', async () => {
      const rol = buildRol();
      const permisoExistente = { id: 7, modulo: ModuloSistema.DASHBOARD, canRead: true, canWrite: true };
      mockRolRepository.findById.mockResolvedValue(rol);
      mockRolRepository.findPermiso.mockResolvedValue(permisoExistente);

      await service.updatePermiso(5, {
        modulo: ModuloSistema.DASHBOARD,
        canRead: false,
        canWrite: false,
      });

      expect(mockRolRepository.updatePermiso).toHaveBeenCalledWith(7, false, false);
    });

    it('devuelve el rol recargado (con los permisos actualizados) al final', async () => {
      const rol = buildRol();
      const rolActualizado = buildRol({
        permisos: [{ id: 7, modulo: ModuloSistema.DASHBOARD, canRead: true, canWrite: true, rol: undefined as never }],
      });
      mockRolRepository.findById.mockResolvedValueOnce(rol).mockResolvedValueOnce(rolActualizado);
      mockRolRepository.findPermiso.mockResolvedValue({ id: 7, modulo: ModuloSistema.DASHBOARD, canRead: true, canWrite: false });

      const result = await service.updatePermiso(5, {
        modulo: ModuloSistema.DASHBOARD,
        canRead: true,
        canWrite: true,
      });

      expect(result.permisos).toEqual([
        { modulo: ModuloSistema.DASHBOARD, canRead: true, canWrite: true },
      ]);
    });
  });
});
