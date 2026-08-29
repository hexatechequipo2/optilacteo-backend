import { Test, TestingModule } from '@nestjs/testing';
import { IngresoCamaraController } from '../ingreso-camara.controller';
import { IngresoCamaraService } from '../ingreso-camara.service';
import { CreateIngresoCamaraDto } from '../dto/create-ingreso-camara.dto';
import { IngresoCamaraFilterQueryDto } from '../dto/ingreso-camara-filter-query.dto';
import type { TenantContext } from '../../../common/types/tenant-context.type';

const mockIngresoCamaraService = {
  create: jest.fn(),
  findAll: jest.fn(),
};

describe('IngresoCamaraController — gestión de ingresos a cámara', () => {
  let controller: IngresoCamaraController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngresoCamaraController],
      providers: [
        {
          provide: IngresoCamaraService,
          useValue: mockIngresoCamaraService,
        },
      ],
    }).compile();

    controller = module.get<IngresoCamaraController>(IngresoCamaraController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Registro de ingreso a cámara', () => {
    it('cuando el responsable de producción registra un ingreso válido, debe delegar la creación al servicio', async () => {
      const dto = {
        loteId: 1,
        camaraId: 1,
        skuId: 1,
        cantidad: 10,
        fechaIngreso: new Date('2024-01-01T00:00:00.000Z'),
      } as unknown as CreateIngresoCamaraDto;

      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const expectedResult = {
        id: 1,
        loteId: 1,
        camaraId: 1,
      };

      mockIngresoCamaraService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(dto, tenant);

      expect(mockIngresoCamaraService.create).toHaveBeenCalledWith(dto, tenant);

      expect(mockIngresoCamaraService.create).toHaveBeenCalledTimes(1);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('Consulta de ingresos a cámara', () => {
    it('cuando un usuario autorizado consulta los ingresos a cámara, debe delegar la búsqueda al servicio con los filtros y la empresa', async () => {
      const query = {
        page: 1,
        limit: 10,
      } as IngresoCamaraFilterQueryDto;

      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const expectedResult = {
        data: [
          {
            id: 1,
            loteId: 1,
            camaraId: 1,
          },
        ],
        total: 1,
      };

      mockIngresoCamaraService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query, tenant);

      expect(mockIngresoCamaraService.findAll).toHaveBeenCalledWith(
        query,
        tenant,
      );

      expect(mockIngresoCamaraService.findAll).toHaveBeenCalledTimes(1);

      expect(result).toEqual(expectedResult);
    });
  });
});
