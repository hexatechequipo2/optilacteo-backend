import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicionManualLoteRepository } from '../repository/medicion-manual-lote.repository';
import { MedicionManualLote } from '../entities/medicion-manual-lote.entity';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

describe('MedicionManualLoteRepository', () => {
  let repository: MedicionManualLoteRepository;
  let rawRepo: Repository<MedicionManualLote>;

  const createQueryBuilderMock: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getRawMany: jest.fn(),
  };

  const mockTypeOrmRepository = {
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => createQueryBuilderMock),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicionManualLoteRepository,
        {
          provide: getRepositoryToken(MedicionManualLote),
          useValue: mockTypeOrmRepository,
        },
      ],
    }).compile();

    repository = module.get<MedicionManualLoteRepository>(
      MedicionManualLoteRepository,
    );
    rawRepo = module.get<Repository<MedicionManualLote>>(
      getRepositoryToken(MedicionManualLote),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('debe delegar el guardado de mediciones en el repositorio de TypeORM', async () => {
      const mediciones: Partial<MedicionManualLote>[] = [
        { loteId: 1, empresaId: 2, parametro: 'TEMP' as any, valor: 4.5 },
      ];
      const savedMediciones = [{ id: 10, ...mediciones[0] }] as MedicionManualLote[];

      mockTypeOrmRepository.save.mockResolvedValue(savedMediciones);

      const result = await repository.create(mediciones);

      expect(rawRepo.save).toHaveBeenCalledWith(mediciones);
      expect(result).toEqual(savedMediciones);
    });
  });

  describe('findByLotePaginado', () => {
    it('debe construir la consulta paginada basica sin filtros opcionales de fecha', async () => {
      const filtro = { loteId: 5, page: 1, limit: 10 };
      const empresaId = 2;
      const expectedResult: [MedicionManualLote[], number] = [[], 0];

      createQueryBuilderMock.getManyAndCount.mockResolvedValue(expectedResult);

      const result = await repository.findByLotePaginado(filtro, empresaId);

      expect(rawRepo.createQueryBuilder).toHaveBeenCalledWith('medicion');
      expect(createQueryBuilderMock.where).toHaveBeenCalledWith(
        'medicion.empresaId = :empresaId',
        { empresaId },
      );
      expect(createQueryBuilderMock.andWhere).toHaveBeenCalledWith(
        'medicion.loteId = :loteId',
        { loteId: filtro.loteId },
      );
      expect(createQueryBuilderMock.orderBy).toHaveBeenCalledWith(
        'medicion.createdAt',
        'DESC',
      );
      expect(createQueryBuilderMock.skip).toHaveBeenCalledWith(0);
      expect(createQueryBuilderMock.take).toHaveBeenCalledWith(10);
      expect(result).toEqual(expectedResult);
    });

    it('debe incluir filtros de fechaInicio y fechaFin cuando estan presentes', async () => {
      const fechaInicio = new Date('2026-01-01');
      const fechaFin = new Date('2026-01-31');
      const filtro = { loteId: 5, page: 2, limit: 20, fechaInicio, fechaFin };
      const empresaId = 2;

      createQueryBuilderMock.getManyAndCount.mockResolvedValue([[], 0]);

      await repository.findByLotePaginado(filtro, empresaId);

      expect(createQueryBuilderMock.andWhere).toHaveBeenCalledWith(
        'medicion.createdAt >= :fechaInicio',
        { fechaInicio },
      );
      expect(createQueryBuilderMock.andWhere).toHaveBeenCalledWith(
        'medicion.createdAt <= :fechaFin',
        { fechaFin },
      );
      expect(createQueryBuilderMock.skip).toHaveBeenCalledWith(20);
      expect(createQueryBuilderMock.take).toHaveBeenCalledWith(20);
    });
  });

  describe('findUltimosValores', () => {
    it('debe retornar los valores convertidos a Number e invertidos en orden cronologico ascendente', async () => {
      const loteId = 10;
      const parametro = Parametro.TEMPERATURA;
      const empresaId = 1;
      const limit = 3;

      // getRawMany devuelve del mas reciente al mas antiguo (DESC)
      const mockRawFilas = [
        { valor: '12.5' },
        { valor: '10.0' },
        { valor: '8.2' },
      ];

      createQueryBuilderMock.getRawMany.mockResolvedValue(mockRawFilas);

      const result = await repository.findUltimosValores(
        loteId,
        parametro,
        empresaId,
        limit,
      );

      expect(createQueryBuilderMock.where).toHaveBeenCalledWith(
        'medicion.empresaId = :empresaId',
        { empresaId },
      );
      expect(createQueryBuilderMock.andWhere).toHaveBeenCalledWith(
        'medicion.loteId = :loteId',
        { loteId },
      );
      expect(createQueryBuilderMock.andWhere).toHaveBeenCalledWith(
        'medicion.parametro = :parametro',
        { parametro },
      );
      expect(createQueryBuilderMock.orderBy).toHaveBeenCalledWith(
        'medicion.createdAt',
        'DESC',
      );
      expect(createQueryBuilderMock.take).toHaveBeenCalledWith(limit);
      expect(createQueryBuilderMock.select).toHaveBeenCalledWith(
        'medicion.valor',
        'valor',
      );

      // Debe quedar en orden cronologico ascendente: [8.2, 10.0, 12.5]
      expect(result).toEqual([8.2, 10.0, 12.5]);
    });
  });
});