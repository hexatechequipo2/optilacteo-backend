import { Test, TestingModule } from '@nestjs/testing';
import { PermisoController } from '../permiso.controller';
import { PermisoService } from '../permiso.service';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';

// Los metadatos de @Roles (GERENTE/ADMINISTRADOR a nivel de clase) no se
// testean aqui por reflexion; este archivo se enfoca en que cada metodo
// del controller delegue en PermisoService con los parametros correctos.

describe('PermisoController', () => {
  let controller: PermisoController;
  let mockPermisoService: {
    findByRol: jest.Mock;
    findByUsuario: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    mockPermisoService = {
      findByRol: jest.fn(),
      findByUsuario: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermisoController],
      providers: [{ provide: PermisoService, useValue: mockPermisoService }],
    }).compile();

    controller = module.get<PermisoController>(PermisoController);
  });

  describe('findByRol', () => {
    it('deberia convertir el query rolId a number y delegar en permisoService.findByRol', async () => {
      mockPermisoService.findByRol.mockResolvedValue([]);

      await controller.findByRol('5');

      expect(mockPermisoService.findByRol).toHaveBeenCalledWith(5);
    });
  });

  describe('findByUsuario', () => {
    it('deberia convertir el param userId a number y delegar en permisoService.findByUsuario', async () => {
      mockPermisoService.findByUsuario.mockResolvedValue([]);

      await controller.findByUsuario('10');

      expect(mockPermisoService.findByUsuario).toHaveBeenCalledWith(10);
    });
  });

  describe('findOne', () => {
    it('deberia convertir el id a number y delegar en permisoService.findOne', async () => {
      mockPermisoService.findOne.mockResolvedValue({ id: 1 });

      await controller.findOne('1');

      expect(mockPermisoService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('deberia convertir el id a number y delegar en permisoService.update con el body', async () => {
      const dto = { modulo: ModuloSistema.DASHBOARD, canRead: true, canWrite: true };
      mockPermisoService.update.mockResolvedValue({ id: 1, ...dto });

      await controller.update('1', dto as never);

      expect(mockPermisoService.update).toHaveBeenCalledWith(1, dto);
    });
  });
});
