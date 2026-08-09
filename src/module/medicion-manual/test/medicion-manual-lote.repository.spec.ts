import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { MedicionManualLoteRepository } from '../repository/medicion-manual-lote.repository';
import { MedicionManualLote } from '../entities/medicion-manual-lote.entity';
import { HistorialMedicionManualFiltro } from '../repository/medicion-manual-lote.repository.interface';

/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

describe('MedicionManualLoteRepository', () => {
  let repository: MedicionManualLoteRepository;
  let typeormRepoMock: jest.Mocked<Repository<MedicionManualLote>>;
  let queryBuilderMock: jest.Mocked<SelectQueryBuilder<MedicionManualLote>>;

  beforeEach(async () => {
    // Mock fluido para el SelectQueryBuilder
    queryBuilderMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<MedicionManualLote>>;

    // Mock del Repository de TypeORM
    typeormRepoMock = {
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
    } as unknown as jest.Mocked<Repository<MedicionManualLote>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicionManualLoteRepository,
        {
          provide: getRepositoryToken(MedicionManualLote),
          useValue: typeormRepoMock,
        },
      ],
    }).compile();

    repository = module.get<MedicionManualLoteRepository>(
      MedicionManualLoteRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('debe llamar a repo.save con el array de mediciones parciales', async () => {
      const mediciones: Partial<MedicionManualLote>[] = [
        {
          loteId: 10,
          empresaId: 1,
          usuarioId: 5,
          parametro: 'TEMP' as any,
          valor: 5.5,
        },
      ];
      const savedEntities = [
        { id: 1, ...mediciones[0] },
      ] as MedicionManualLote[];

      typeormRepoMock.save.mockResolvedValue(savedEntities as any);

      const result = await repository.create(mediciones);

      expect(typeormRepoMock.save).toHaveBeenCalledWith(mediciones);
      expect(result).toBe(savedEntities);
    });
  });

  describe('findByLotePaginado', () => {
    const empresaId = 1;
    const baseFiltro: HistorialMedicionManualFiltro = {
      loteId: 10,
      page: 1,
      limit: 10,
    };

    it('debe construir la consulta base con empresaId, loteId y paginación correcta', async () => {
      const mockResult: [MedicionManualLote[], number] = [[], 0];
      queryBuilderMock.getManyAndCount.mockResolvedValue(mockResult);

      const result = await repository.findByLotePaginado(baseFiltro, empresaId);

      expect(typeormRepoMock.createQueryBuilder).toHaveBeenCalledWith(
        'medicion',
      );
      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        'medicion.empresaId = :empresaId',
        { empresaId },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'medicion.loteId = :loteId',
        { loteId: 10 },
      );
      expect(queryBuilderMock.orderBy).toHaveBeenCalledWith(
        'medicion.createdAt',
        'DESC',
      );
      expect(queryBuilderMock.skip).toHaveBeenCalledWith(0); // (page 1 - 1) * 10 = 0
      expect(queryBuilderMock.take).toHaveBeenCalledWith(10);
      expect(result).toBe(mockResult);
    });

    it('debe calcular el offset correcto para la página 3', async () => {
      const filtroPage3: HistorialMedicionManualFiltro = {
        loteId: 10,
        page: 3,
        limit: 15,
      };
      queryBuilderMock.getManyAndCount.mockResolvedValue([[], 0]);

      await repository.findByLotePaginado(filtroPage3, empresaId);

      expect(queryBuilderMock.skip).toHaveBeenCalledWith(30); // (page 3 - 1) * 15 = 30
      expect(queryBuilderMock.take).toHaveBeenCalledWith(15);
    });

    it('debe agregar los filtros de fechaInicio y fechaFin si se proveen', async () => {
      const fechaInicio = new Date('2026-07-01T00:00:00Z');
      const fechaFin = new Date('2026-07-31T23:59:59Z');

      const filtroConFechas: HistorialMedicionManualFiltro = {
        ...baseFiltro,
        fechaInicio,
        fechaFin,
      };
      queryBuilderMock.getManyAndCount.mockResolvedValue([[], 0]);

      await repository.findByLotePaginado(filtroConFechas, empresaId);

      expect(queryBuilderMock.andWhere).toHaveBeenNthCalledWith(
        2,
        'medicion.createdAt >= :fechaInicio',
        { fechaInicio },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenNthCalledWith(
        3,
        'medicion.createdAt <= :fechaFin',
        { fechaFin },
      );
    });

    it('no debe agregar filtros de fecha si estos son undefined', async () => {
      queryBuilderMock.getManyAndCount.mockResolvedValue([[], 0]);

      await repository.findByLotePaginado(baseFiltro, empresaId);

      expect(queryBuilderMock.andWhere).toHaveBeenCalledTimes(1); // Solo para loteId
      expect(queryBuilderMock.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('createdAt'),
        expect.anything(),
      );
    });
  });
});
