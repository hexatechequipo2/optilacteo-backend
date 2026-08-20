import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoteConsumoService } from '../lote-consumo.service';
import { LOTE_REPOSITORY } from '../../lote/repository/lote-repository.interface';
import { LoteProduccion } from '../../lote/entities/lote-produccion.entity';
import { LoteConsumo } from '../../lote/entities/lote-consumo.entity';
import { EstadoLote } from '../../lote/enums/estado-lote.enum';
import { LoteConsumoMapper } from '../../lote/mappers/lote-consumo.mapper';
import type { TenantContext } from '../../../common/types/tenant-context.type';
import type { CreateLoteConsumoDto } from '../../lote/dto/create-lote-consumo.dto';

const mockLoteRepository = {
  findById: jest.fn(),
  save: jest.fn(),
};

const mockLoteProduccionRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
};

const mockLoteConsumoRepository = {
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

describe('LoteConsumoService — consumo parcial de lotes', () => {
  let service: LoteConsumoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoteConsumoService,
        {
          provide: LOTE_REPOSITORY,
          useValue: mockLoteRepository,
        },
        {
          provide: getRepositoryToken(LoteProduccion),
          useValue: mockLoteProduccionRepository,
        },
        {
          provide: getRepositoryToken(LoteConsumo),
          useValue: mockLoteConsumoRepository,
        },
      ],
    }).compile();

    service = module.get<LoteConsumoService>(LoteConsumoService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Registro de consumo', () => {
    it('cuando el lote existe y hay cantidad disponible, debe registrar el primer consumo y actualizar el saldo', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const dto = {
        cantidad: 40,
        loteProduccionId: 10,
        parametros: [],
      } as CreateLoteConsumoDto;

      const lote = {
        id: 5,
        empresaId: 1,
        estado: EstadoLote.REGISTRADO,
        cantidad: 100,
        cantidadDisponible: 100,
      };

      const loteProduccion = {
        id: 10,
        codigo: 'PROD-1-00001',
      };

      const consumoCreado = {
        id: 1,
        loteIngresoId: 5,
        loteProduccionId: 10,
        cantidad: 40,
        empresaId: 1,
        usuarioId: 7,
        parametros: [],
      };

      mockLoteRepository.findById.mockResolvedValue(lote);
      mockLoteConsumoRepository.count.mockResolvedValue(0);
      mockLoteProduccionRepository.findOne.mockResolvedValue(
        loteProduccion,
      );
      mockLoteConsumoRepository.create.mockReturnValue(consumoCreado);
      mockLoteConsumoRepository.save.mockResolvedValue(consumoCreado);
      mockLoteRepository.save.mockResolvedValue(lote);

      const mapperSpy = jest
        .spyOn(LoteConsumoMapper, 'toResponseDto')
        .mockReturnValue(consumoCreado as any);

      const result = await service.registrarConsumo(
        5,
        dto,
        7,
        tenant,
      );

      expect(mockLoteRepository.findById).toHaveBeenCalledWith(5, 1);

      expect(mockLoteConsumoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          loteIngresoId: 5,
          loteProduccionId: 10,
          cantidad: 40,
          empresaId: 1,
          usuarioId: 7,
        }),
      );

      expect(lote.cantidadDisponible).toBe(60);
      expect(lote.estado).toBe(EstadoLote.EN_PROCESO);

      expect(mockLoteRepository.save).toHaveBeenCalledWith(lote);

      expect(mapperSpy).toHaveBeenCalledWith(
        consumoCreado,
        loteProduccion.codigo,
      );

      expect(result).toEqual(consumoCreado);

      mapperSpy.mockRestore();
    });

    it('cuando el lote no existe para la empresa autenticada, debe lanzar NotFoundException', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      mockLoteRepository.findById.mockResolvedValue(null);

      await expect(
        service.registrarConsumo(
          999,
          { cantidad: 10 } as CreateLoteConsumoDto,
          7,
          tenant,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockLoteConsumoRepository.create).not.toHaveBeenCalled();
    });

    it('cuando el lote está finalizado, no debe permitir nuevos consumos', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      mockLoteRepository.findById.mockResolvedValue({
        id: 5,
        estado: EstadoLote.FINALIZADO,
      });

      await expect(
        service.registrarConsumo(
          5,
          { cantidad: 10 } as CreateLoteConsumoDto,
          7,
          tenant,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('cuando el lote está rechazado, no debe permitir nuevos consumos', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      mockLoteRepository.findById.mockResolvedValue({
        id: 5,
        estado: EstadoLote.RECHAZADO,
      });

      await expect(
        service.registrarConsumo(
          5,
          { cantidad: 10 } as CreateLoteConsumoDto,
          7,
          tenant,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('cuando el lote no tiene cantidad total o disponible, debe rechazar el consumo parcial', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      mockLoteRepository.findById.mockResolvedValue({
        id: 5,
        estado: EstadoLote.REGISTRADO,
        cantidad: null,
        cantidadDisponible: null,
      });

      await expect(
        service.registrarConsumo(
          5,
          { cantidad: 10 } as CreateLoteConsumoDto,
          7,
          tenant,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('cuando la cantidad solicitada supera el saldo disponible, debe lanzar BadRequestException', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      mockLoteRepository.findById.mockResolvedValue({
        id: 5,
        estado: EstadoLote.EN_PROCESO,
        cantidad: 100,
        cantidadDisponible: 30,
      });

      await expect(
        service.registrarConsumo(
          5,
          { cantidad: 50 } as CreateLoteConsumoDto,
          7,
          tenant,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockLoteConsumoRepository.create).not.toHaveBeenCalled();
    });

    it('cuando existe un consumo previo y no se registran nuevos parámetros, debe rechazar el consumo del remanente', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      mockLoteRepository.findById.mockResolvedValue({
        id: 5,
        estado: EstadoLote.EN_PROCESO,
        cantidad: 100,
        cantidadDisponible: 60,
      });

      mockLoteConsumoRepository.count.mockResolvedValue(1);

      await expect(
        service.registrarConsumo(
          5,
          {
            cantidad: 20,
            parametros: [],
          } as CreateLoteConsumoDto,
          7,
          tenant,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('cuando el consumo utiliza exactamente todo el saldo disponible, debe finalizar el lote', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const lote = {
        id: 5,
        estado: EstadoLote.EN_PROCESO,
        cantidad: 100,
        cantidadDisponible: 40,
      };

      const loteProduccion = {
        id: 10,
        codigo: 'PROD-1-00001',
      };

      const consumo = {
        id: 1,
      };

      mockLoteRepository.findById.mockResolvedValue(lote);
      mockLoteConsumoRepository.count.mockResolvedValue(0);
      mockLoteProduccionRepository.findOne.mockResolvedValue(
        loteProduccion,
      );
      mockLoteConsumoRepository.create.mockReturnValue(consumo);
      mockLoteConsumoRepository.save.mockResolvedValue(consumo);

      mockLoteRepository.save.mockResolvedValue(lote);

      const mapperSpy = jest
        .spyOn(LoteConsumoMapper, 'toResponseDto')
        .mockReturnValue(consumo as any);

      await service.registrarConsumo(
        5,
        {
          cantidad: 40,
          loteProduccionId: 10,
        } as CreateLoteConsumoDto,
        7,
        tenant,
      );

      expect(lote.cantidadDisponible).toBe(0);
      expect(lote.estado).toBe(EstadoLote.FINALIZADO);

      expect(mockLoteRepository.save).toHaveBeenCalledWith(lote);

      mapperSpy.mockRestore();
    });

    it('cuando se indica un lote de producción inexistente, debe lanzar NotFoundException', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      mockLoteRepository.findById.mockResolvedValue({
        id: 5,
        estado: EstadoLote.REGISTRADO,
        cantidad: 100,
        cantidadDisponible: 100,
      });

      mockLoteConsumoRepository.count.mockResolvedValue(0);

      mockLoteProduccionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.registrarConsumo(
          5,
          {
            cantidad: 10,
            loteProduccionId: 999,
          } as CreateLoteConsumoDto,
          7,
          tenant,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('cuando no se informa un lote de producción, debe crear uno automáticamente con un código secuencial', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const lote = {
        id: 5,
        estado: EstadoLote.REGISTRADO,
        cantidad: 100,
        cantidadDisponible: 100,
      };

      const nuevoLoteProduccion = {
        id: 10,
        empresaId: 1,
        codigo: 'PROD-1-00003',
      };

      const consumo = {
        id: 1,
      };

      mockLoteRepository.findById.mockResolvedValue(lote);
      mockLoteConsumoRepository.count.mockResolvedValue(0);

      mockLoteProduccionRepository.count.mockResolvedValue(2);

      mockLoteProduccionRepository.create.mockReturnValue(
        nuevoLoteProduccion,
      );

      mockLoteProduccionRepository.save.mockResolvedValue(
        nuevoLoteProduccion,
      );

      mockLoteConsumoRepository.create.mockReturnValue(consumo);
      mockLoteConsumoRepository.save.mockResolvedValue(consumo);
      mockLoteRepository.save.mockResolvedValue(lote);

      const mapperSpy = jest
        .spyOn(LoteConsumoMapper, 'toResponseDto')
        .mockReturnValue(consumo as any);

      await service.registrarConsumo(
        5,
        { cantidad: 20 } as CreateLoteConsumoDto,
        7,
        tenant,
      );

      expect(mockLoteProduccionRepository.count).toHaveBeenCalledWith({
        where: { empresaId: 1 },
      });

      expect(mockLoteProduccionRepository.create).toHaveBeenCalledWith({
        empresaId: 1,
        codigo: 'PROD-1-00003',
      });

      mapperSpy.mockRestore();
    });

    it('cuando no se puede determinar la empresa autenticada, debe lanzar BadRequestException', async () => {
      const tenant = {} as TenantContext;

      await expect(
        service.registrarConsumo(
          5,
          { cantidad: 10 } as CreateLoteConsumoDto,
          7,
          tenant,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockLoteRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('Historial de consumos', () => {
    it('cuando el lote existe, debe devolver su historial de consumos ordenado', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const lote = {
        id: 5,
      };

      const consumos = [
        {
          id: 1,
          cantidad: 40,
        },
      ];

      mockLoteRepository.findById.mockResolvedValue(lote);
      mockLoteConsumoRepository.find.mockResolvedValue(consumos);

      const mapperSpy = jest
        .spyOn(LoteConsumoMapper, 'toResponseDtoList')
        .mockReturnValue(consumos as any);

      const result = await service.historial(5, tenant);

      expect(mockLoteConsumoRepository.find).toHaveBeenCalledWith({
        where: {
          loteIngresoId: 5,
          empresaId: 1,
        },
        relations: {
          parametros: true,
          loteProduccion: true,
        },
        order: {
          createdAt: 'ASC',
        },
      });

      expect(result).toEqual(consumos);

      mapperSpy.mockRestore();
    });

    it('cuando el lote no existe, debe lanzar NotFoundException al consultar su historial', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      mockLoteRepository.findById.mockResolvedValue(null);

      await expect(
        service.historial(999, tenant),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Listado de lotes de producción', () => {
    it('cuando existen lotes de producción, debe devolverlos para el selector del frontend', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const lotes = [
        {
          id: 2,
          codigo: 'PROD-1-00002',
          createdAt: new Date('2026-08-20'),
        },
      ];

      mockLoteProduccionRepository.find.mockResolvedValue(lotes);

      const result = await service.findLotesProduccion(tenant);

      expect(mockLoteProduccionRepository.find).toHaveBeenCalledWith({
        where: {
          empresaId: 1,
        },
        order: {
          createdAt: 'DESC',
        },
      });

      expect(result).toEqual([
        {
          id: 2,
          codigo: 'PROD-1-00002',
          createdAt: lotes[0].createdAt,
        },
      ]);
    });
  });
});