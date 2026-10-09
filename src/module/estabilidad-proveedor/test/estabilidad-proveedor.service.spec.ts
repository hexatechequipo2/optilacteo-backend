import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import {
  EstabilidadProveedorService,
  MIN_LOTES_ESTABILIDAD,
  MAX_LOTES_VENTANA,
} from '../estabilidad-proveedor.service';
import { Lote } from '../../lote/entities/lote.entity';
import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { ProveedorEstabilidad } from '../entities/proveedor-estabilidad.entity';
import { ESTABILIDAD_CLIENT } from '../interfaces/estabilidad-client.interface';

describe('EstabilidadProveedorService', () => {
  let service: EstabilidadProveedorService;

  const mockQueryBuilder = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  const mockEstabilidadRepo = {
    findOne: jest.fn(),
    create: jest.fn((dto) => ({ ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  };

  const mockLoteRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockConfigRepo = {
    find: jest.fn(),
  };

  const mockEstabilidadClient = {
    clasificar: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstabilidadProveedorService,
        {
          provide: ESTABILIDAD_CLIENT,
          useValue: mockEstabilidadClient,
        },
        {
          provide: getRepositoryToken(ProveedorEstabilidad),
          useValue: mockEstabilidadRepo,
        },
        {
          provide: getRepositoryToken(Lote),
          useValue: mockLoteRepo,
        },
        {
          provide: getRepositoryToken(ConfiguracionParametro),
          useValue: mockConfigRepo,
        },
      ],
    }).compile();

    service = module.get<EstabilidadProveedorService>(
      EstabilidadProveedorService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('recalcularBestEffort', () => {
    it('debe ejecutar recalcular exitosamente sin registrar logs de error', async () => {
      jest.spyOn(service, 'recalcular').mockResolvedValue(undefined);
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      await service.recalcularBestEffort(1, 100);

      expect(service.recalcular).toHaveBeenCalledWith(1, 100);
      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('debe capturar cualquier error lanzado por recalcular y registrarlo en el logger sin propagarlo', async () => {
      const errorSimulado = new Error('Error simulado en base de datos');
      jest.spyOn(service, 'recalcular').mockRejectedValue(errorSimulado);
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      await expect(
        service.recalcularBestEffort(1, 100),
      ).resolves.not.toThrow();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Error al recalcular estabilidad del proveedor 1',
        ),
      );
    });
  });

  describe('recalcular', () => {
    const proveedorId = 1;
    const empresaId = 100;

    it('debe guardar "insufficient_data" si hay menos lotes que MIN_LOTES_ESTABILIDAD', async () => {
      const lotesInsuficientes = Array(MIN_LOTES_ESTABILIDAD - 1).fill({
        id: 1,
        materiaPrima: 'LECHE_ENTERA',
        parametros: [],
      });

      mockQueryBuilder.getMany.mockResolvedValue(lotesInsuficientes);
      mockEstabilidadRepo.findOne.mockResolvedValue(null);

      await service.recalcular(proveedorId, empresaId);

      expect(mockEstabilidadRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          proveedorId,
          empresaId,
          cantidadLotes: MIN_LOTES_ESTABILIDAD - 1,
          status: 'insufficient_data',
        }),
      );
      expect(mockEstabilidadClient.clasificar).not.toHaveBeenCalled();
    });

    it('debe construir las series históricas correctamente y persistir el resultado retornado por el cliente ML', async () => {
      const lotesValidos = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        materiaPrima: 'LECHE_ENTERA',
        parametros: [{ parametro: 'GRASA', valor: '3.5' }],
      }));

      const configsMock = [
        {
          parametro: 'GRASA',
          tipoMateriaPrima: 'LECHE_ENTERA',
          umbralMin: '3.0',
          umbralMax: '4.0',
          empresaId,
        },
      ];

      const resultadoML = {
        status: 'ok',
        clasificacion: 'ESTABLE',
        score: 0.98,
        detalle: [],
        modeloVersion: 'v1.0.0',
      };

      mockQueryBuilder.getMany.mockResolvedValue(lotesValidos);
      mockConfigRepo.find.mockResolvedValue(configsMock);
      mockEstabilidadClient.clasificar.mockResolvedValue(resultadoML);
      mockEstabilidadRepo.findOne.mockResolvedValue(null);

      await service.recalcular(proveedorId, empresaId);

      expect(mockEstabilidadClient.clasificar).toHaveBeenCalledWith({
        empresaId,
        proveedorId,
        series: [
          {
            parametro: 'GRASA',
            materiaPrima: 'LECHE_ENTERA',
            valores: [3.5, 3.5, 3.5, 3.5, 3.5],
            umbralMin: 3.0,
            umbralMax: 4.0,
          },
        ],
      });

      expect(mockEstabilidadRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          proveedorId,
          empresaId,
          status: 'ok',
          clasificacion: 'ESTABLE',
          score: '0.98',
          cantidadLotes: 5,
        }),
      );
    });
  });

  describe('recalcularTodos', () => {
    it('debe obtener todos los pares proveedor/empresa únicos y llamar a recalcularBestEffort para cada uno', async () => {
      const paresMock = [
        { proveedorId: '1', empresaId: '100' },
        { proveedorId: '2', empresaId: '100' },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(paresMock);
      const bestEffortSpy = jest
        .spyOn(service, 'recalcularBestEffort')
        .mockResolvedValue(undefined);

      const resultado = await service.recalcularTodos();

      expect(resultado).toEqual([
        { proveedorId: 1, empresaId: 100 },
        { proveedorId: 2, empresaId: 100 },
      ]);
      expect(bestEffortSpy).toHaveBeenCalledTimes(2);
      expect(bestEffortSpy).toHaveBeenNthCalledWith(1, 1, 100);
      expect(bestEffortSpy).toHaveBeenNthCalledWith(2, 2, 100);
    });
  });

  describe('obtener', () => {
    const proveedorId = 1;
    const empresaId = 100;

    it('debe retornar insuficiente_data si no existe registro de estabilidad en la base de datos', async () => {
      mockEstabilidadRepo.findOne.mockResolvedValue(null);

      const resultado = await service.obtener(proveedorId, empresaId);

      expect(resultado).toEqual({
        status: 'insufficient_data',
        mensaje: 'Sin datos suficientes',
        cantidadLotes: 0,
        minimoLotes: MIN_LOTES_ESTABILIDAD,
      });
    });

    it('debe retornar insuficiente_data si el status guardado en BD es diferente de "ok"', async () => {
      mockEstabilidadRepo.findOne.mockResolvedValue({
        status: 'insufficient_data',
        cantidadLotes: 3,
      });

      const resultado = await service.obtener(proveedorId, empresaId);

      expect(resultado).toEqual({
        status: 'insufficient_data',
        mensaje: 'Sin datos suficientes',
        cantidadLotes: 3,
        minimoLotes: MIN_LOTES_ESTABILIDAD,
      });
    });

    it('debe retornar los detalles de estabilidad correctamente formateados cuando el status es "ok"', async () => {
      const ahora = new Date();
      mockEstabilidadRepo.findOne.mockResolvedValue({
        status: 'ok',
        clasificacion: 'ESTABLE',
        score: '0.92',
        detalle: [{ parametro: 'GRASA', status: 'OK' }],
        cantidadLotes: 12,
        calculadoEn: ahora,
      });

      const resultado = await service.obtener(proveedorId, empresaId);

      expect(resultado).toEqual({
        status: 'ok',
        clasificacion: 'ESTABLE',
        score: 0.92,
        detalle: [{ parametro: 'GRASA', status: 'OK' }],
        cantidadLotes: 12,
        calculadoEn: ahora,
      });
    });
  });
});