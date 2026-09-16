import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  MlTrainingDataService,
  MIN_PARAMETROS_ENTRENAMIENTO,
} from '../ml-training-data.service';
import { Lote } from '../../lote/entities/lote.entity';

describe('MlTrainingDataService — extracción de datos de entrenamiento ML (HU-49)', () => {
  let service: MlTrainingDataService;

  const createQueryBuilderMock = () => {
    const qb: any = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };
    return qb;
  };

  let qbMock: ReturnType<typeof createQueryBuilderMock>;

  const mockLoteRepo = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    qbMock = createQueryBuilderMock();
    mockLoteRepo.createQueryBuilder.mockReturnValue(qbMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MlTrainingDataService,
        {
          provide: getRepositoryToken(Lote),
          useValue: mockLoteRepo,
        },
      ],
    }).compile();

    service = module.get<MlTrainingDataService>(MlTrainingDataService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('obtenerLotesParaEntrenamiento', () => {
    it('debe construir la consulta SQL pivoteada con los parámetros mínimos requeridos y parsear numéricos/nulos', async () => {
      const empresaId = 1;
      const mockRawRows = [
        {
          ph: '6.5',
          temperatura: '4.2',
          densidad: '1.032',
          grasa: '3.5',
          proteina: null,
          acidez: '15.0',
          conductividad: null,
          destino_real: 'Queso Cremoso',
        },
      ];

      qbMock.getRawMany.mockResolvedValue(mockRawRows);

      const resultado = await service.obtenerLotesParaEntrenamiento(empresaId);

      expect(mockLoteRepo.createQueryBuilder).toHaveBeenCalledWith('lote');
      expect(qbMock.innerJoin).toHaveBeenCalledWith('lote.destinoProductivo', 'destino');
      expect(qbMock.leftJoin).toHaveBeenCalledWith('lote.parametros', 'p');
      expect(qbMock.where).toHaveBeenCalledWith('lote.empresaId = :empresaId', { empresaId });
      expect(qbMock.andWhere).toHaveBeenCalledWith('lote.destinoProductivoId IS NOT NULL');
      expect(qbMock.having).toHaveBeenCalledWith('COUNT(DISTINCT p.parametro) >= :minimo', {
        minimo: MIN_PARAMETROS_ENTRENAMIENTO,
      });

      expect(resultado).toEqual([
        {
          ph: 6.5,
          temperatura: 4.2,
          densidad: 1.032,
          grasa: 3.5,
          proteina: null,
          acidez: 15,
          conductividad: null,
          destino_real: 'Queso Cremoso',
        },
      ]);
    });

    it('cuando no hay lotes que cumplan los criterios para la empresa, debe retornar una lista vacía', async () => {
      const empresaId = 99;
      qbMock.getRawMany.mockResolvedValue([]);

      const resultado = await service.obtenerLotesParaEntrenamiento(empresaId);

      expect(resultado).toEqual([]);
    });
  });
});