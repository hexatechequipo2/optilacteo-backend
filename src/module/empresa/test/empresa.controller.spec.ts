import { Test, TestingModule } from '@nestjs/testing';
import { EmpresaController } from '../empresa.controller';
import { EmpresaService } from '../empresa.service';
import { Plan } from '../enums/plan.enum';
import { ModuloSistema } from '../enums/modulo-sistema.enum';
import { ROLES } from '../../rol/constants/roles.constants';
import type { TenantContext } from '../../../common/types/tenant-context.type';

// Los metadatos de @Roles/@CurrentEmpresa (quien puede pegarle a cada ruta)
// ya estan cubiertos por reflexion en empresa-admin-only-routes.spec.ts.
// Este archivo se enfoca en que cada metodo del controller delegue en
// EmpresaService con los parametros correctos (conversion de id, body, query).

const tenantAdmin: TenantContext = { empresaId: null, rolNombre: ROLES.ADMINISTRADOR };

describe('EmpresaController', () => {
  let controller: EmpresaController;
  let mockEmpresaService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findMine: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    activate: jest.Mock;
    deactivate: jest.Mock;
    activarModulo: jest.Mock;
    desactivarModulo: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    mockEmpresaService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findMine: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      activarModulo: jest.fn(),
      desactivarModulo: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmpresaController],
      providers: [{ provide: EmpresaService, useValue: mockEmpresaService }],
    }).compile();

    controller = module.get<EmpresaController>(EmpresaController);
  });

  describe('create', () => {
    it('deberia delegar en empresaService.create con el DTO recibido en el body', async () => {
      // Arrange
      const dto = { name: 'Lacteos Norte', plan: Plan.STARTER };
      mockEmpresaService.create.mockResolvedValue({ id: 1, ...dto });

      // Act
      const result = await controller.create(dto as never);

      // Assert
      expect(mockEmpresaService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('findAll', () => {
    it('deberia delegar en empresaService.findAll con el query de paginacion', async () => {
      // Arrange
      const pagination = { page: 2, limit: 10 };
      mockEmpresaService.findAll.mockResolvedValue({ data: [], meta: {} });

      // Act
      await controller.findAll(pagination);

      // Assert
      expect(mockEmpresaService.findAll).toHaveBeenCalledWith(pagination);
    });
  });

  describe('findMine', () => {
    it('deberia delegar en empresaService.findMine con el tenant inyectado por @CurrentEmpresa', async () => {
      // Arrange
      mockEmpresaService.findMine.mockResolvedValue({ id: 1 });

      // Act
      await controller.findMine(tenantAdmin);

      // Assert
      expect(mockEmpresaService.findMine).toHaveBeenCalledWith(tenantAdmin);
    });
  });

  describe('findOne', () => {
    it('deberia convertir el id de string a number antes de delegar en empresaService.findOne', async () => {
      // Arrange
      mockEmpresaService.findOne.mockResolvedValue({ id: 7 });

      // Act
      await controller.findOne('7', tenantAdmin);

      // Assert
      expect(mockEmpresaService.findOne).toHaveBeenCalledWith(7, tenantAdmin);
    });
  });

  describe('update', () => {
    it('deberia delegar en empresaService.update con id numerico, body y tenant', async () => {
      // Arrange
      const dto = { name: 'Nuevo nombre' };
      mockEmpresaService.update.mockResolvedValue({ id: 3, ...dto });

      // Act
      await controller.update('3', dto as never, tenantAdmin);

      // Assert
      expect(mockEmpresaService.update).toHaveBeenCalledWith(3, dto, tenantAdmin);
    });
  });

  describe('activate / deactivate', () => {
    it('activate deberia delegar en empresaService.activate con id numerico y tenant', async () => {
      // Arrange
      mockEmpresaService.activate.mockResolvedValue({ id: 4, isActive: true });

      // Act
      await controller.activate('4', tenantAdmin);

      // Assert
      expect(mockEmpresaService.activate).toHaveBeenCalledWith(4, tenantAdmin);
    });

    it('deactivate deberia delegar en empresaService.deactivate con id numerico y tenant', async () => {
      // Arrange
      mockEmpresaService.deactivate.mockResolvedValue({ id: 4, isActive: false });

      // Act
      await controller.deactivate('4', tenantAdmin);

      // Assert
      expect(mockEmpresaService.deactivate).toHaveBeenCalledWith(4, tenantAdmin);
    });
  });

  describe('activarModulo / desactivarModulo', () => {
    it('activarModulo deberia delegar en empresaService.activarModulo con id numerico, dto y tenant', async () => {
      // Arrange
      const dto = { modulo: ModuloSistema.SENSORES_IOT };
      mockEmpresaService.activarModulo.mockResolvedValue({ modulo: dto.modulo, isActive: true });

      // Act
      await controller.activarModulo('5', dto as never, tenantAdmin);

      // Assert
      expect(mockEmpresaService.activarModulo).toHaveBeenCalledWith(5, dto, tenantAdmin);
    });

    it('desactivarModulo deberia delegar en empresaService.desactivarModulo con id numerico, dto y tenant', async () => {
      // Arrange
      const dto = { modulo: ModuloSistema.SENSORES_IOT };
      mockEmpresaService.desactivarModulo.mockResolvedValue({ modulo: dto.modulo, isActive: false });

      // Act
      await controller.desactivarModulo('5', dto as never, tenantAdmin);

      // Assert
      expect(mockEmpresaService.desactivarModulo).toHaveBeenCalledWith(5, dto, tenantAdmin);
    });
  });

  describe('remove', () => {
    it('deberia delegar en empresaService.remove con id numerico y tenant', async () => {
      // Arrange
      mockEmpresaService.remove.mockResolvedValue({ id: 6, isActive: false });

      // Act
      await controller.remove('6', tenantAdmin);

      // Assert
      expect(mockEmpresaService.remove).toHaveBeenCalledWith(6, tenantAdmin);
    });
  });
});
