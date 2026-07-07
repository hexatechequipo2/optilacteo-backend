import { Test, TestingModule } from '@nestjs/testing';
import { RolController } from '../rol.controller';
import { RolService } from '../rol.service';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';

// Los metadatos de @Roles (GERENTE/ADMINISTRADOR a nivel de clase) no se
// testean aqui por reflexion; este archivo se enfoca en que cada metodo
// del controller delegue en RolService con los parametros correctos.

describe('RolController', () => {
  let controller: RolController;
  let mockRolService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findByEmpresa: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    updatePermiso: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    mockRolService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByEmpresa: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      updatePermiso: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolController],
      providers: [{ provide: RolService, useValue: mockRolService }],
    }).compile();

    controller = module.get<RolController>(RolController);
  });

  describe('create', () => {
    it('deberia delegar en rolService.create con el DTO recibido en el body', async () => {
      const dto = { nombre: 'Supervisor de calidad', empresaId: 1 };
      mockRolService.create.mockResolvedValue({ id: 1, ...dto });

      await controller.create(dto as never);

      expect(mockRolService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('sin query empresaId, deberia delegar en rolService.findAll', async () => {
      mockRolService.findAll.mockResolvedValue([]);

      await controller.findAll();

      expect(mockRolService.findAll).toHaveBeenCalledWith();
      expect(mockRolService.findByEmpresa).not.toHaveBeenCalled();
    });

    it('con query empresaId, deberia convertirlo a number y delegar en rolService.findByEmpresa', async () => {
      mockRolService.findByEmpresa.mockResolvedValue([]);

      await controller.findAll('1');

      expect(mockRolService.findByEmpresa).toHaveBeenCalledWith(1);
      expect(mockRolService.findAll).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('deberia convertir el id de string a number antes de delegar en rolService.findOne', async () => {
      mockRolService.findOne.mockResolvedValue({ id: 5 });

      await controller.findOne('5');

      expect(mockRolService.findOne).toHaveBeenCalledWith(5);
    });
  });

  describe('update', () => {
    it('deberia convertir el id a number y delegar en rolService.update con el body', async () => {
      const dto = { nombre: 'Nuevo nombre' };
      mockRolService.update.mockResolvedValue({ id: 5, ...dto });

      await controller.update('5', dto as never);

      expect(mockRolService.update).toHaveBeenCalledWith(5, dto);
    });
  });

  describe('updatePermiso', () => {
    it('deberia convertir el id a number y delegar en rolService.updatePermiso con el body', async () => {
      const dto = { modulo: ModuloSistema.DASHBOARD, canRead: true, canWrite: false };
      mockRolService.updatePermiso.mockResolvedValue({ id: 5, permisos: [dto] });

      await controller.updatePermiso('5', dto as never);

      expect(mockRolService.updatePermiso).toHaveBeenCalledWith(5, dto);
    });
  });

  describe('remove', () => {
    it('deberia convertir el id a number y delegar en rolService.remove', async () => {
      mockRolService.remove.mockResolvedValue({ message: 'Rol con id 5 eliminado correctamente' });

      const result = await controller.remove('5');

      expect(mockRolService.remove).toHaveBeenCalledWith(5);
      expect(result).toEqual({ message: 'Rol con id 5 eliminado correctamente' });
    });
  });
});
