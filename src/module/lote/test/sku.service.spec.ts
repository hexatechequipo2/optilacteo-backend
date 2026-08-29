import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { SkuService } from '../sku.service';
import { SKU_REPOSITORY } from '../repository/sku-repository.interface';
import { SkuMapper } from '../mappers/sku.mapper';
import type { TenantContext } from '../../../common/types/tenant-context.type';
import type { CreateSkuDto } from '../dto/create-sku.dto';
import type { UpdateSkuDto } from '../dto/update-sku.dto';

const mockSkuRepository = {
  findByNombre: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  findAllActivosByEmpresa: jest.fn(),
  findById: jest.fn(),
};

describe('SkuService — gestión del catálogo de SKU', () => {
  let service: SkuService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkuService,
        {
          provide: SKU_REPOSITORY,
          useValue: mockSkuRepository,
        },
      ],
    }).compile();

    service = module.get<SkuService>(SkuService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Creación de SKU', () => {
    it('cuando el nombre no existe para la empresa, debe crear el SKU activo', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const dto = {
        nombre: 'Leche Entera 1L',
        unidadMedida: 'UNIDAD',
      } as unknown as CreateSkuDto;

      const skuCreado = {
        id: 1,
        ...dto,
        empresaId: 1,
        activo: true,
      };

      mockSkuRepository.findByNombre.mockResolvedValue(null);

      mockSkuRepository.create.mockReturnValue(skuCreado);

      mockSkuRepository.save.mockResolvedValue(skuCreado);

      const mapperSpy = jest
        .spyOn(SkuMapper, 'toResponseDto')
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .mockReturnValue(skuCreado as any);

      const result = await service.create(dto, tenant);

      expect(mockSkuRepository.findByNombre).toHaveBeenCalledWith(
        dto.nombre,
        1,
      );

      expect(mockSkuRepository.create).toHaveBeenCalledWith({
        ...dto,
        empresaId: 1,
        activo: true,
      });

      expect(mockSkuRepository.save).toHaveBeenCalledWith(skuCreado);

      expect(result).toEqual(skuCreado);

      mapperSpy.mockRestore();
    });

    it('cuando ya existe un SKU con el mismo nombre para la empresa, debe lanzar ConflictException', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const dto = {
        nombre: 'Leche Entera 1L',
      } as CreateSkuDto;

      mockSkuRepository.findByNombre.mockResolvedValue({
        id: 1,
        nombre: dto.nombre,
      });

      await expect(service.create(dto, tenant)).rejects.toThrow(
        ConflictException,
      );

      expect(mockSkuRepository.create).not.toHaveBeenCalled();
      expect(mockSkuRepository.save).not.toHaveBeenCalled();
    });

    it('cuando no se puede determinar la empresa autenticada, debe lanzar BadRequestException', async () => {
      const tenant = {} as TenantContext;

      await expect(
        service.create(
          {
            nombre: 'Leche Entera 1L',
          } as CreateSkuDto,
          tenant,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockSkuRepository.findByNombre).not.toHaveBeenCalled();
    });
  });

  describe('Consulta de SKU activos', () => {
    it('cuando existen SKU activos, debe devolverlos transformados para la empresa autenticada', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const skus = [
        {
          id: 1,
          nombre: 'Leche Entera 1L',
          activo: true,
        },
      ];

      mockSkuRepository.findAllActivosByEmpresa.mockResolvedValue(skus);

      const mapperSpy = jest
        .spyOn(SkuMapper, 'toResponseDtoList')
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .mockReturnValue(skus as any);

      const result = await service.findAll(tenant);

      expect(mockSkuRepository.findAllActivosByEmpresa).toHaveBeenCalledWith(1);

      expect(mapperSpy).toHaveBeenCalledWith(skus);

      expect(result).toEqual(skus);

      mapperSpy.mockRestore();
    });
  });

  describe('Actualización de SKU', () => {
    it('cuando el SKU existe, debe actualizar únicamente los campos enviados', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const sku = {
        id: 5,
        nombre: 'Leche Entera 1L',
        unidadMedida: 'UNIDAD',
        activo: true,
      };

      const dto = {
        nombre: 'Leche Descremada 1L',
      } as UpdateSkuDto;

      mockSkuRepository.findById.mockResolvedValue(sku);
      mockSkuRepository.save.mockResolvedValue({
        ...sku,
        ...dto,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const mapperSpy = jest.spyOn(SkuMapper, 'toResponseDto').mockReturnValue({
        ...sku,
        ...dto,
      } as any);

      const result = await service.update(5, dto, tenant);

      expect(mockSkuRepository.findById).toHaveBeenCalledWith(5, 1);

      expect(mockSkuRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Leche Descremada 1L',
          unidadMedida: 'UNIDAD',
        }),
      );

      expect(result).toEqual({
        ...sku,
        ...dto,
      });

      mapperSpy.mockRestore();
    });

    it('cuando el SKU no existe, debe lanzar NotFoundException', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      mockSkuRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(
          999,
          {
            nombre: 'Nuevo SKU',
          },
          tenant,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Desactivación de SKU', () => {
    it('cuando el SKU existe, debe marcarlo como inactivo', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const sku = {
        id: 5,
        activo: true,
      };

      const saved = {
        ...sku,
        activo: false,
      };

      mockSkuRepository.findById.mockResolvedValue(sku);
      mockSkuRepository.save.mockResolvedValue(saved);

      const mapperSpy = jest
        .spyOn(SkuMapper, 'toResponseDto')
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .mockReturnValue(saved as any);

      const result = await service.deactivate(5, tenant);

      expect(sku.activo).toBe(false);

      expect(mockSkuRepository.save).toHaveBeenCalledWith(sku);

      expect(result).toEqual(saved);

      mapperSpy.mockRestore();
    });

    it('cuando el SKU no existe, no debe poder desactivarlo y debe lanzar NotFoundException', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      mockSkuRepository.findById.mockResolvedValue(null);

      await expect(service.deactivate(999, tenant)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Activación de SKU', () => {
    it('cuando el SKU está inactivo, debe activarlo correctamente', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const sku = {
        id: 5,
        activo: false,
      };

      const saved = {
        ...sku,
        activo: true,
      };

      mockSkuRepository.findById.mockResolvedValue(sku);
      mockSkuRepository.save.mockResolvedValue(saved);

      const mapperSpy = jest
        .spyOn(SkuMapper, 'toResponseDto')
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .mockReturnValue(saved as any);

      const result = await service.activate(5, tenant);

      expect(sku.activo).toBe(true);

      expect(mockSkuRepository.save).toHaveBeenCalledWith(sku);

      expect(result).toEqual(saved);

      mapperSpy.mockRestore();
    });

    it('cuando el SKU ya está activo, debe lanzar BadRequestException y no guardarlo nuevamente', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      mockSkuRepository.findById.mockResolvedValue({
        id: 5,
        activo: true,
      });

      await expect(service.activate(5, tenant)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockSkuRepository.save).not.toHaveBeenCalled();
    });

    it('cuando el SKU no existe, debe lanzar NotFoundException', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      mockSkuRepository.findById.mockResolvedValue(null);

      await expect(service.activate(999, tenant)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
