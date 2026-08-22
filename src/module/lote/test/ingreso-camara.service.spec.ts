import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { IngresoCamaraService } from '../ingreso-camara.service';
import { INGRESO_CAMARA_REPOSITORY } from '../repository/ingreso-camara-repository.interface';
import { SKU_REPOSITORY } from '../repository/sku-repository.interface';
import { LOTE_REPOSITORY } from '../repository/lote-repository.interface';
import { IngresoCamaraMapper } from '../mappers/ingreso-camara.mapper';
import type { TenantContext } from '../../../common/types/tenant-context.type';
import type { CreateIngresoCamaraDto } from '../dto/create-ingreso-camara.dto';
import type { IngresoCamaraFilterQueryDto } from '../dto/ingreso-camara-filter-query.dto';

const mockIngresoCamaraRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
};

const mockSkuRepository = {
  findById: jest.fn(),
};

const mockLoteRepository = {
  findById: jest.fn(),
};

describe('IngresoCamaraService — gestión de ingresos a cámara', () => {
  let service: IngresoCamaraService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngresoCamaraService,
        {
          provide: INGRESO_CAMARA_REPOSITORY,
          useValue: mockIngresoCamaraRepository,
        },
        {
          provide: SKU_REPOSITORY,
          useValue: mockSkuRepository,
        },
        {
          provide: LOTE_REPOSITORY,
          useValue: mockLoteRepository,
        },
      ],
    }).compile();

    service = module.get<IngresoCamaraService>(IngresoCamaraService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Registro de ingreso a cámara', () => {
    it('cuando los datos son válidos, el SKU está activo y pertenece a la empresa, debe registrar el ingreso correctamente', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const dto = {
        skuId: 10,
        cantidad: 100,
        loteId: 5,
        fechaIngreso: '2026-08-20T10:00:00.000Z',
      } as CreateIngresoCamaraDto;

      const sku = {
        id: 10,
        activo: true,
      };

      const lote = {
        id: 5,
      };

      const ingresoCreado = {
        empresaId: 1,
        skuId: 10,
        cantidad: 100,
        loteId: 5,
        fechaIngreso: new Date(dto.fechaIngreso),
      };

      const ingresoGuardado = {
        id: 1,
        ...ingresoCreado,
      };

      const ingresoCompleto = {
        id: 1,
        ...ingresoCreado,
        sku: {
          nombre: 'Leche Entera',
        },
        lote: {
          codigo: 'LOTE-001',
        },
      };

      mockSkuRepository.findById.mockResolvedValue(sku);
      mockLoteRepository.findById.mockResolvedValue(lote);

      mockIngresoCamaraRepository.create.mockReturnValue(ingresoCreado);

      mockIngresoCamaraRepository.save.mockResolvedValue(
        ingresoGuardado,
      );

      mockIngresoCamaraRepository.findById.mockResolvedValue(
        ingresoCompleto,
      );

      const mapperSpy = jest
        .spyOn(IngresoCamaraMapper, 'toResponseDto')
        .mockReturnValue(ingresoCompleto as any);

      const result = await service.create(dto, tenant);

      expect(mockSkuRepository.findById).toHaveBeenCalledWith(
        dto.skuId,
        tenant.empresaId,
      );

      expect(mockLoteRepository.findById).toHaveBeenCalledWith(
        dto.loteId,
        tenant.empresaId,
      );

      expect(mockIngresoCamaraRepository.create).toHaveBeenCalledWith({
        empresaId: 1,
        skuId: dto.skuId,
        cantidad: dto.cantidad,
        loteId: dto.loteId,
        fechaIngreso: new Date(dto.fechaIngreso),
      });

      expect(mockIngresoCamaraRepository.save).toHaveBeenCalledWith(
        ingresoCreado,
      );

      expect(mockIngresoCamaraRepository.findById).toHaveBeenCalledWith(
        ingresoGuardado.id,
        tenant.empresaId,
      );

      expect(mapperSpy).toHaveBeenCalledWith(ingresoCompleto);

      expect(result).toEqual(ingresoCompleto);

      mapperSpy.mockRestore();
    });

    it('cuando no se puede determinar la empresa del usuario autenticado, debe lanzar BadRequestException', async () => {
      const tenant = {} as TenantContext;

      const dto = {
        skuId: 10,
        cantidad: 100,
        fechaIngreso: '2026-08-20T10:00:00.000Z',
      } as CreateIngresoCamaraDto;

      await expect(
        service.create(dto, tenant),
      ).rejects.toThrow(BadRequestException);

      expect(mockSkuRepository.findById).not.toHaveBeenCalled();
      expect(mockIngresoCamaraRepository.create).not.toHaveBeenCalled();
      expect(mockIngresoCamaraRepository.save).not.toHaveBeenCalled();
    });

    it('cuando el SKU no existe o no pertenece a la empresa, debe lanzar NotFoundException', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const dto = {
        skuId: 999,
        cantidad: 100,
        fechaIngreso: '2026-08-20T10:00:00.000Z',
      } as CreateIngresoCamaraDto;

      mockSkuRepository.findById.mockResolvedValue(null);

      await expect(
        service.create(dto, tenant),
      ).rejects.toThrow(NotFoundException);

      expect(mockSkuRepository.findById).toHaveBeenCalledWith(
        dto.skuId,
        tenant.empresaId,
      );

      expect(mockIngresoCamaraRepository.create).not.toHaveBeenCalled();
      expect(mockIngresoCamaraRepository.save).not.toHaveBeenCalled();
    });

    it('cuando el SKU está desactivado, debe lanzar NotFoundException', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const dto = {
        skuId: 10,
        cantidad: 100,
        fechaIngreso: '2026-08-20T10:00:00.000Z',
      } as CreateIngresoCamaraDto;

      mockSkuRepository.findById.mockResolvedValue({
        id: 10,
        activo: false,
      });

      await expect(
        service.create(dto, tenant),
      ).rejects.toThrow(NotFoundException);

      expect(mockIngresoCamaraRepository.create).not.toHaveBeenCalled();
      expect(mockIngresoCamaraRepository.save).not.toHaveBeenCalled();
    });

    it('cuando se informa un lote de origen que no existe o no pertenece a la empresa, debe lanzar NotFoundException', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const dto = {
        skuId: 10,
        cantidad: 100,
        loteId: 999,
        fechaIngreso: '2026-08-20T10:00:00.000Z',
      } as CreateIngresoCamaraDto;

      mockSkuRepository.findById.mockResolvedValue({
        id: 10,
        activo: true,
      });

      mockLoteRepository.findById.mockResolvedValue(null);

      await expect(
        service.create(dto, tenant),
      ).rejects.toThrow(NotFoundException);

      expect(mockLoteRepository.findById).toHaveBeenCalledWith(
        dto.loteId,
        tenant.empresaId,
      );

      expect(mockIngresoCamaraRepository.create).not.toHaveBeenCalled();
      expect(mockIngresoCamaraRepository.save).not.toHaveBeenCalled();
    });

    it('cuando no se informa un lote de origen, debe registrar el ingreso con loteId en null sin consultar el repositorio de lotes', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const dto = {
        skuId: 10,
        cantidad: 100,
        fechaIngreso: '2026-08-20T10:00:00.000Z',
      } as CreateIngresoCamaraDto;

      const ingresoCreado = {
        empresaId: 1,
        skuId: 10,
        cantidad: 100,
        loteId: null,
        fechaIngreso: new Date(dto.fechaIngreso),
      };

      const ingresoGuardado = {
        id: 1,
        ...ingresoCreado,
      };

      mockSkuRepository.findById.mockResolvedValue({
        id: 10,
        activo: true,
      });

      mockIngresoCamaraRepository.create.mockReturnValue(
        ingresoCreado,
      );

      mockIngresoCamaraRepository.save.mockResolvedValue(
        ingresoGuardado,
      );

      mockIngresoCamaraRepository.findById.mockResolvedValue(
        ingresoGuardado,
      );

      const mapperSpy = jest
        .spyOn(IngresoCamaraMapper, 'toResponseDto')
        .mockReturnValue(ingresoGuardado as any);

      const result = await service.create(dto, tenant);

      expect(mockLoteRepository.findById).not.toHaveBeenCalled();

      expect(mockIngresoCamaraRepository.create).toHaveBeenCalledWith({
        empresaId: 1,
        skuId: dto.skuId,
        cantidad: dto.cantidad,
        loteId: null,
        fechaIngreso: new Date(dto.fechaIngreso),
      });

      expect(result).toEqual(ingresoGuardado);

      mapperSpy.mockRestore();
    });

    it('cuando el ingreso se guarda pero no se puede recargar con relaciones, debe utilizar el ingreso guardado para generar la respuesta', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const dto = {
        skuId: 10,
        cantidad: 100,
        fechaIngreso: '2026-08-20T10:00:00.000Z',
      } as CreateIngresoCamaraDto;

      const ingresoCreado = {
        empresaId: 1,
        skuId: 10,
        cantidad: 100,
        loteId: null,
        fechaIngreso: new Date(dto.fechaIngreso),
      };

      const ingresoGuardado = {
        id: 1,
        ...ingresoCreado,
      };

      mockSkuRepository.findById.mockResolvedValue({
        id: 10,
        activo: true,
      });

      mockIngresoCamaraRepository.create.mockReturnValue(
        ingresoCreado,
      );

      mockIngresoCamaraRepository.save.mockResolvedValue(
        ingresoGuardado,
      );

      mockIngresoCamaraRepository.findById.mockResolvedValue(null);

      const mapperSpy = jest
        .spyOn(IngresoCamaraMapper, 'toResponseDto')
        .mockReturnValue(ingresoGuardado as any);

      const result = await service.create(dto, tenant);

      expect(mapperSpy).toHaveBeenCalledWith(ingresoGuardado);

      expect(result).toEqual(ingresoGuardado);

      mapperSpy.mockRestore();
    });
  });

  describe('Consulta de ingresos a cámara', () => {
    it('cuando el usuario consulta los ingresos de su empresa, debe devolver los registros paginados y transformados', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const query = {
        page: 2,
        limit: 10,
      } as IngresoCamaraFilterQueryDto;

      const ingresos = [
        {
          id: 1,
          empresaId: 1,
          skuId: 10,
          cantidad: 100,
        },
        {
          id: 2,
          empresaId: 1,
          skuId: 11,
          cantidad: 200,
        },
      ];

      const total = 2;

      const mappedResponse = [
        {
          id: 1,
          cantidad: 100,
        },
        {
          id: 2,
          cantidad: 200,
        },
      ];

      mockIngresoCamaraRepository.findAll.mockResolvedValue([
        ingresos,
        total,
      ]);

      const mapperSpy = jest
        .spyOn(IngresoCamaraMapper, 'toResponseDtoList')
        .mockReturnValue(mappedResponse as any);

      const result = await service.findAll(query, tenant);

      expect(mockIngresoCamaraRepository.findAll).toHaveBeenCalledWith(
        query,
        tenant.empresaId,
      );

      expect(mapperSpy).toHaveBeenCalledWith(ingresos);

      expect(result).toEqual({
        data: mappedResponse,
        total: 2,
        page: 2,
        limit: 10,
      });

      mapperSpy.mockRestore();
    });

    it('cuando no se informan page y limit, debe utilizar los valores por defecto 1 y 20', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const query = {} as IngresoCamaraFilterQueryDto;

      mockIngresoCamaraRepository.findAll.mockResolvedValue([
        [],
        0,
      ]);

      const mapperSpy = jest
        .spyOn(IngresoCamaraMapper, 'toResponseDtoList')
        .mockReturnValue([]);

      const result = await service.findAll(query, tenant);

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      mapperSpy.mockRestore();
    });

    it('cuando no se puede determinar la empresa del usuario autenticado, no debe realizar la consulta y debe lanzar BadRequestException', async () => {
      const tenant = {} as TenantContext;

      const query = {
        page: 1,
        limit: 20,
      } as IngresoCamaraFilterQueryDto;

      await expect(
        service.findAll(query, tenant),
      ).rejects.toThrow(BadRequestException);

      expect(mockIngresoCamaraRepository.findAll).not.toHaveBeenCalled();
    });
  });
});