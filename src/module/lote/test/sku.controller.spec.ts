import { Test, TestingModule } from '@nestjs/testing';
import { SkuController } from '../sku.controller';
import { SkuService } from '../sku.service';
import type { TenantContext } from '../../../common/types/tenant-context.type';
import type { CreateSkuDto } from '../dto/create-sku.dto';
import type { UpdateSkuDto } from '../dto/update-sku.dto';

const mockSkuService = {
  create: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  deactivate: jest.fn(),
  activate: jest.fn(),
};

describe('SkuController — gestión de SKU', () => {
  let controller: SkuController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SkuController],
      providers: [
        {
          provide: SkuService,
          useValue: mockSkuService,
        },
      ],
    }).compile();

    controller = module.get<SkuController>(SkuController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Registro de SKU', () => {
    it('cuando el administrador registra un SKU válido, debe delegar la creación al servicio', async () => {
      const dto = {
        nombre: 'Leche Entera 1L',
        unidadMedida: 'UNIDAD',
      } as unknown as CreateSkuDto;

      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const expectedResult = {
        id: 1,
        ...dto,
        activo: true,
      };

      mockSkuService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(dto, tenant);

      expect(mockSkuService.create).toHaveBeenCalledWith(dto, tenant);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('Consulta de SKU', () => {
    it('cuando un usuario autorizado consulta los SKU, debe delegar la búsqueda al servicio', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const expectedResult = [
        {
          id: 1,
          nombre: 'Leche Entera 1L',
          activo: true,
        },
      ];

      mockSkuService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(tenant);

      expect(mockSkuService.findAll).toHaveBeenCalledWith(tenant);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('Actualización de SKU', () => {
    it('cuando se actualiza un SKU, debe convertir el id a número y delegar la operación al servicio', async () => {
      const id = '5';

      const dto = {
        nombre: 'Leche Descremada 1L',
      } as UpdateSkuDto;

      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const expectedResult = {
        id: 5,
        nombre: 'Leche Descremada 1L',
      };

      mockSkuService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(id, dto, tenant);

      expect(mockSkuService.update).toHaveBeenCalledWith(5, dto, tenant);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('Desactivación de SKU', () => {
    it('cuando se desactiva un SKU, debe convertir el id a número y delegar la operación al servicio', async () => {
      const id = '5';

      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const expectedResult = {
        id: 5,
        activo: false,
      };

      mockSkuService.deactivate.mockResolvedValue(expectedResult);

      const result = await controller.deactivate(id, tenant);

      expect(mockSkuService.deactivate).toHaveBeenCalledWith(5, tenant);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('Activación de SKU', () => {
    it('cuando se activa un SKU, debe convertir el id a número y delegar la operación al servicio', async () => {
      const id = '5';

      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const expectedResult = {
        id: 5,
        activo: true,
      };

      mockSkuService.activate.mockResolvedValue(expectedResult);

      const result = await controller.activate(id, tenant);

      expect(mockSkuService.activate).toHaveBeenCalledWith(5, tenant);

      expect(result).toEqual(expectedResult);
    });
  });
});
