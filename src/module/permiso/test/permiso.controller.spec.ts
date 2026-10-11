import { Test, TestingModule } from '@nestjs/testing';
import { PermisoController } from '../permiso.controller';
import { PermisoService } from '../permiso.service';
import { TenantContext } from '../../../common/types/tenant-context.type';

describe('PermisoController', () => {
  let controller: PermisoController;
  let mockPermisoService: {
    findByRol: jest.Mock;
    findByUsuario: jest.Mock;
    findOne: jest.Mock;
  };

  const mockTenant: TenantContext = { empresaId: 1, rolNombre: null };

  beforeEach(async () => {
    mockPermisoService = {
      findByRol: jest.fn(),
      findByUsuario: jest.fn(),
      findOne: jest.fn(),
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

      await controller.findByRol('5', mockTenant);

      expect(mockPermisoService.findByRol).toHaveBeenCalledWith(
        5,
        mockTenant.empresaId,
      );
    });
  });

  describe('findByUsuario', () => {
    it('deberia convertir el param userId a number y delegar en permisoService.findByUsuario', async () => {
      mockPermisoService.findByUsuario.mockResolvedValue([]);

      await controller.findByUsuario('10', mockTenant);

      expect(mockPermisoService.findByUsuario).toHaveBeenCalledWith(
        10,
        mockTenant.empresaId,
      );
    });
  });

  describe('findOne', () => {
    it('deberia convertir el id a number y delegar en permisoService.findOne', async () => {
      mockPermisoService.findOne.mockResolvedValue({ id: 1 });

      await controller.findOne('1', mockTenant);

      expect(mockPermisoService.findOne).toHaveBeenCalledWith(
        1,
        mockTenant.empresaId,
      );
    });
  });
});