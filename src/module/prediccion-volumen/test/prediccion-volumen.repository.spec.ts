import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PrediccionVolumenRepository } from '../repository/prediccion-volumen.repository';
import { PrediccionVolumen } from '../entities/prediccion-volumen.entity';
import { Lote } from '../../lote/entities/lote.entity';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { StatusPrediccion } from '../enums/status-prediccion.enum';

describe('PrediccionVolumenRepository', () => {
  let repository: PrediccionVolumenRepository;
  let repoMock: jest.Mocked<Partial<Repository<PrediccionVolumen>>>;
  let loteRepoMock: jest.Mocked<Partial<Repository<Lote>>>;
  let queryBuilderMock: jest.Mocked<Partial<SelectQueryBuilder<Lote>>>;

  beforeEach(async () => {
    queryBuilderMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };

    repoMock = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    loteRepoMock = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrediccionVolumenRepository,
        {
          provide: getRepositoryToken(PrediccionVolumen),
          useValue: repoMock,
        },
        {
          provide: getRepositoryToken(Lote),
          useValue: loteRepoMock,
        },
      ],
    }).compile();

    repository = module.get<PrediccionVolumenRepository>(PrediccionVolumenRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('debe instanciar y guardar una predicción', async () => {
      const partialEntity: Partial<PrediccionVolumen> = {
        empresaId: 1,
        tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
        status: StatusPrediccion.OK,
      };
      const createdEntity = { id: 10, ...partialEntity } as PrediccionVolumen;

      (repoMock.create as jest.Mock).mockReturnValue(createdEntity);
      (repoMock.save as jest.Mock).mockResolvedValue(createdEntity);

      const result = await repository.create(partialEntity);

      expect(repoMock.create).toHaveBeenCalledWith(partialEntity);
      expect(repoMock.save).toHaveBeenCalledWith(createdEntity);
      expect(result).toEqual(createdEntity);
    });
  });

  describe('findUltimaVigente', () => {
    it('debe buscar el registro más reciente ordenado por fechaGeneracion DESC', async () => {
      const mockResult = {
        id: 5,
        empresaId: 1,
        tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
        fechaGeneracion: new Date('2026-09-16'),
      } as PrediccionVolumen;

      (repoMock.findOne as jest.Mock).mockResolvedValue(mockResult);

      const result = await repository.findUltimaVigente(1, TipoMateriaPrima.LECHE_CRUDA);

      expect(repoMock.findOne).toHaveBeenCalledWith({
        where: { empresaId: 1, tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA },
        order: { fechaGeneracion: 'DESC' },
      });
      expect(result).toEqual(mockResult);
    });

    it('debe retornar null si no existe ningún registro previo', async () => {
      (repoMock.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.findUltimaVigente(1, TipoMateriaPrima.LECHE_CRUDA);

      expect(result).toBeNull();
    });
  });

  describe('obtenerSerieHistorica', () => {
    it('debe construir la query de agregación y convertir los valores devueltos a número', async () => {
      const desde = new Date('2026-01-01');
      const hasta = new Date('2026-09-16');
      const rawResults = [
        { fecha: '2026-09-15', valor: '1500.50' },
        { fecha: '2026-09-16', valor: '2000.00' },
      ];

      (queryBuilderMock.getRawMany as jest.Mock).mockResolvedValue(rawResults);

      const result = await repository.obtenerSerieHistorica(
        1,
        TipoMateriaPrima.LECHE_CRUDA,
        desde,
        hasta,
      );

      expect(loteRepoMock.createQueryBuilder).toHaveBeenCalledWith('lote');
      expect(queryBuilderMock.where).toHaveBeenCalledWith('lote.empresaId = :empresaId', {
        empresaId: 1,
      });
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'lote.materiaPrima = :tipoMateriaPrima',
        { tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith('lote.cantidad IS NOT NULL');
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'lote.fechaIngreso BETWEEN :desde AND :hasta',
        { desde, hasta },
      );
      expect(queryBuilderMock.select).toHaveBeenCalledWith(
        "TO_CHAR(lote.fechaIngreso, 'YYYY-MM-DD')",
        'fecha',
      );
      expect(queryBuilderMock.addSelect).toHaveBeenCalledWith('SUM(lote.cantidad)', 'valor');
      expect(queryBuilderMock.groupBy).toHaveBeenCalledWith(
        "TO_CHAR(lote.fechaIngreso, 'YYYY-MM-DD')",
      );
      expect(queryBuilderMock.orderBy).toHaveBeenCalledWith('fecha', 'ASC');

      expect(result).toEqual([
        { fecha: '2026-09-15', valor: 1500.5 },
        { fecha: '2026-09-16', valor: 2000 },
      ]);
    });
  });

  describe('findEmpresasConDatos', () => {
    it('debe ejecutar un query DISTINCT para obtener los empresaId con lotes cargados', async () => {
      const rawResults = [{ empresaId: 1 }, { empresaId: 3 }];
      (queryBuilderMock.getRawMany as jest.Mock).mockResolvedValue(rawResults);

      const result = await repository.findEmpresasConDatos(TipoMateriaPrima.LECHE_CRUDA);

      expect(loteRepoMock.createQueryBuilder).toHaveBeenCalledWith('lote');
      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        'lote.materiaPrima = :tipoMateriaPrima',
        { tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith('lote.cantidad IS NOT NULL');
      expect(queryBuilderMock.select).toHaveBeenCalledWith(
        'DISTINCT lote.empresaId',
        'empresaId',
      );

      expect(result).toEqual([1, 3]);
    });
  });
});