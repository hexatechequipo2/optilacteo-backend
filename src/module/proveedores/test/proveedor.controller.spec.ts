import { Test, TestingModule } from '@nestjs/testing';
import { ProveedoresController } from '../proveedor.controller';
import { ProveedoresService } from '../proveedor.service';
import { TipoProveedor } from '../enums/tipo-proveedor.enum';
import { EstadoProveedor } from '../enums/estado-proveedor.enum';
import { ROLES } from '../../rol/constants/roles.constants';
import type { TenantContext } from '../../../common/types/tenant-context.type';

// Los metadatos de @Roles/@CurrentEmpresa (quien puede pegarle a cada ruta)
// no se testean aqui por reflexion; este archivo se enfoca en que cada
// metodo del controller delegue en ProveedoresService con los parametros
// correctos (ParseIntPipe ya convierte el id antes de llegar aca).

const tenantEmpresaA: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };
const tenantAdmin: TenantContext = { empresaId: null, rolNombre: ROLES.ADMINISTRADOR };

describe('ProveedoresController', () => {
  let controller: ProveedoresController;
  let mockProveedoresService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    activate: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    mockProveedoresService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      activate: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProveedoresController],
      providers: [{ provide: ProveedoresService, useValue: mockProveedoresService }],
    }).compile();

    controller = module.get<ProveedoresController>(ProveedoresController);
  });

  describe('findAll', () => {
    it('deberia delegar en proveedoresService.findAll con el tenant y el query de paginacion', async () => {
      const pagination = { page: 2, limit: 10 };
      mockProveedoresService.findAll.mockResolvedValue({ data: [], meta: {} });

      await controller.findAll(tenantEmpresaA, pagination as never);

      expect(mockProveedoresService.findAll).toHaveBeenCalledWith(tenantEmpresaA, pagination);
    });
  });

  describe('findOne', () => {
    it('deberia delegar en proveedoresService.findOne con el id (ya numerico via ParseIntPipe) y el tenant', async () => {
      mockProveedoresService.findOne.mockResolvedValue({ id: 7 });

      await controller.findOne(7, tenantEmpresaA);

      expect(mockProveedoresService.findOne).toHaveBeenCalledWith(7, tenantEmpresaA);
    });
  });

  describe('create', () => {
    it('deberia delegar en proveedoresService.create con el DTO del body y el tenant', async () => {
      const dto = {
        razonSocial: 'Tambo El Sol',
        cuit: '20-12345678-9',
        tipo: TipoProveedor.TAMBO,
        provincia: 'Córdoba',
        localidad: 'Villa María',
        capacidad: 500,
      };
      mockProveedoresService.create.mockResolvedValue({ id: 1, ...dto });

      const result = await controller.create(dto as never, tenantEmpresaA);

      expect(mockProveedoresService.create).toHaveBeenCalledWith(dto, tenantEmpresaA);
      expect(result).toEqual({ id: 1, ...dto });
    });

    it('no fuerza empresaId: se lo pasa tal cual al service, que decide segun el rol del tenant', async () => {
      const dto = {
        razonSocial: 'Transporte Rapido',
        cuit: '20-98765432-1',
        tipo: TipoProveedor.TRANSPORTE,
        empresaId: 999,
      };
      mockProveedoresService.create.mockResolvedValue({ id: 2, ...dto });

      await controller.create(dto as never, tenantAdmin);

      expect(mockProveedoresService.create).toHaveBeenCalledWith(dto, tenantAdmin);
    });
  });

  describe('update', () => {
    it('deberia delegar en proveedoresService.update con id, body y tenant', async () => {
      const dto = { razonSocial: 'Nueva razon social' };
      mockProveedoresService.update.mockResolvedValue({ id: 3, ...dto });

      await controller.update(3, dto as never, tenantEmpresaA);

      expect(mockProveedoresService.update).toHaveBeenCalledWith(3, dto, tenantEmpresaA);
    });
  });

  describe('activate', () => {
    it('deberia delegar en proveedoresService.activate con id y tenant', async () => {
      mockProveedoresService.activate.mockResolvedValue({ id: 4, estado: EstadoProveedor.ACTIVA });

      await controller.activate(4, tenantEmpresaA);

      expect(mockProveedoresService.activate).toHaveBeenCalledWith(4, tenantEmpresaA);
    });
  });

  describe('remove', () => {
    it('deberia delegar en proveedoresService.remove con id y tenant, y devolver el mensaje de confirmacion', async () => {
      mockProveedoresService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(5, tenantEmpresaA);

      expect(mockProveedoresService.remove).toHaveBeenCalledWith(5, tenantEmpresaA);
      expect(result).toEqual({ message: 'Proveedor con id "5" eliminado correctamente' });
    });
  });
});
