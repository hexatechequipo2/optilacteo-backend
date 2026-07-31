import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorLoteHistorialRepository } from '../repository/sensor-lote-historial.repository';
import { SensorLoteHistorial } from '../entities/sensor-lote-historial.entity';

describe('SensorLoteHistorialRepository', () => {
  let repository: SensorLoteHistorialRepository;
  let typeormRepoMock: jest.Mocked<Repository<SensorLoteHistorial>>;
  let queryBuilderMock: any;

  beforeEach(async () => {
    queryBuilderMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      distinctOn: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    typeormRepoMock = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
      manager: {
        query: jest.fn(),
      },
    } as unknown as jest.Mocked<Repository<SensorLoteHistorial>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensorLoteHistorialRepository,
        {
          provide: getRepositoryToken(SensorLoteHistorial),
          useValue: typeormRepoMock,
        },
      ],
    }).compile();

    repository = module.get<SensorLoteHistorialRepository>(
      SensorLoteHistorialRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('debe guardar un registro de historial', async () => {
      const registro = {
        sensorId: 1,
        loteIdAnterior: null,
        loteIdNuevo: 10,
        userId: 2,
        empresaId: 5,
      } as SensorLoteHistorial;

      typeormRepoMock.save.mockResolvedValue(registro);

      const result = await repository.create(registro);

      expect(typeormRepoMock.save).toHaveBeenCalledWith(registro);
      expect(result).toBe(registro);
    });
  });

  describe('findBySensor', () => {
    it('debe retornar los historiales de un sensor ordenados por fecha descendente', async () => {
      const sensorId = 1;
      const empresaId = 5;
      const mockList = [{ id: 10 }, { id: 20 }] as SensorLoteHistorial[];

      typeormRepoMock.find.mockResolvedValue(mockList);

      const result = await repository.findBySensor(sensorId, empresaId);

      expect(typeormRepoMock.find).toHaveBeenCalledWith({
        where: { sensorId, empresaId },
        order: { fecha: 'DESC' },
      });
      expect(result).toBe(mockList);
    });
  });

  describe('findByLote', () => {
    it('debe construir la query adecuadamente para buscar historiales asociados a un lote', async () => {
      const loteId = 10;
      const empresaId = 5;
      const mockList = [{ id: 100 }] as SensorLoteHistorial[];

      queryBuilderMock.getMany.mockResolvedValue(mockList);

      const result = await repository.findByLote(loteId, empresaId);

      expect(typeormRepoMock.createQueryBuilder).toHaveBeenCalledWith('h');
      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        'h.empresaId = :empresaId',
        { empresaId },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        '(h.loteIdNuevo = :loteId OR h.loteIdAnterior = :loteId)',
        { loteId },
      );
      expect(queryBuilderMock.orderBy).toHaveBeenCalledWith('h.fecha', 'DESC');
      expect(result).toBe(mockList);
    });
  });

  describe('findUltimoPorSensor', () => {
    it('debe buscar el último registro del sensor por fecha descendente', async () => {
      const sensorId = 1;
      const empresaId = 5;
      const mockRegistro = { id: 50, sensorId } as SensorLoteHistorial;

      typeormRepoMock.findOne.mockResolvedValue(mockRegistro);

      const result = await repository.findUltimoPorSensor(sensorId, empresaId);

      expect(typeormRepoMock.findOne).toHaveBeenCalledWith({
        where: { sensorId, empresaId },
        order: { fecha: 'DESC' },
      });
      expect(result).toBe(mockRegistro);
    });
  });

  describe('findUltimosPorSensores', () => {
    it('debe devolver un arreglo vacío inmediatamente si sensorIds está vacío', async () => {
      const result = await repository.findUltimosPorSensores([], 5);

      expect(result).toEqual([]);
      expect(typeormRepoMock.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('debe armar la consulta con distinctOn si existen sensorIds', async () => {
      const sensorIds = [1, 2, 3];
      const empresaId = 5;
      const mockList = [{ id: 1 }, { id: 2 }] as SensorLoteHistorial[];

      queryBuilderMock.getMany.mockResolvedValue(mockList);

      const result = await repository.findUltimosPorSensores(
        sensorIds,
        empresaId,
      );

      expect(typeormRepoMock.createQueryBuilder).toHaveBeenCalledWith('h');
      expect(queryBuilderMock.distinctOn).toHaveBeenCalledWith(['h.sensorId']);
      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        'h.empresaId = :empresaId',
        { empresaId },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'h.sensorId IN (:...sensorIds)',
        { sensorIds },
      );
      expect(queryBuilderMock.orderBy).toHaveBeenCalledWith('h.sensorId');
      expect(queryBuilderMock.addOrderBy).toHaveBeenCalledWith(
        'h.fecha',
        'DESC',
      );
      expect(result).toBe(mockList);
    });
  });

  describe('findSensoresActualesDeLote', () => {
    it('debe ejecutar la consulta SQL nativa y filtrar los sensorId cuyo loteIdNuevo coincide con el parámetro', async () => {
      const loteId = 10;
      const empresaId = 5;

      const rawResult = [
        { sensorId: 1, loteIdNuevo: 10 },
        { sensorId: 2, loteIdNuevo: 20 },
        { sensorId: 3, loteIdNuevo: 10 },
      ];

      (typeormRepoMock.manager.query as jest.Mock).mockResolvedValue(rawResult);

      const result = await repository.findSensoresActualesDeLote(
        loteId,
        empresaId,
      );

      expect(typeormRepoMock.manager.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT ON ("sensorId")'),
        [empresaId],
      );
      expect(result).toEqual([1, 3]);
    });
  });
});