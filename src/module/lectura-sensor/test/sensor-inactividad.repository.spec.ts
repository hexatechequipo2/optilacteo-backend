import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { SensorInactividadRepository } from '../repository/sensor-inactividad.repository';
import { Sensor } from '../../sensor/entities/sensor.entity';
import { EstadoSensor } from '../../sensor/enums/estado-sensor.enum';
import { EstadoLote } from '../../lote/enums/estado-lote.enum';

describe('SensorInactividadRepository', () => {
  let repository: SensorInactividadRepository;

  const managerMock = {
    query: jest.fn(),
  };

  const repoMock = {
    manager: managerMock,
    findBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensorInactividadRepository,
        {
          provide: getRepositoryToken(Sensor),
          useValue: repoMock,
        },
      ],
    }).compile();

    repository = module.get<SensorInactividadRepository>(
      SensorInactividadRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findSensoresInactivos', () => {
    it('debe devolver un arreglo vacío cuando la consulta SQL no devuelve sensores', async () => {
      managerMock.query.mockResolvedValue([]);

      const cutoff = new Date();

      const result = await repository.findSensoresInactivos(cutoff);

      expect(managerMock.query).toHaveBeenCalledWith(expect.any(String), [
        EstadoSensor.ACTIVO,
        EstadoLote.EN_PROCESO,
        cutoff,
      ]);

      expect(repoMock.findBy).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('debe buscar y devolver los sensores encontrados', async () => {
      const cutoff = new Date();

      managerMock.query.mockResolvedValue([{ id: 1 }, { id: 5 }, { id: 8 }]);

      const sensores = [{ id: 1 }, { id: 5 }, { id: 8 }];

      repoMock.findBy.mockResolvedValue(sensores);

      const result = await repository.findSensoresInactivos(cutoff);

      expect(managerMock.query).toHaveBeenCalled();

      expect(repoMock.findBy).toHaveBeenCalledWith({
        id: In([1, 5, 8]),
      });

      expect(result).toEqual(sensores);
    });

    it('debe propagar un error cuando falla la consulta SQL', async () => {
      const cutoff = new Date();

      managerMock.query.mockRejectedValue(new Error('DB Error'));

      await expect(repository.findSensoresInactivos(cutoff)).rejects.toThrow(
        'DB Error',
      );

      expect(repoMock.findBy).not.toHaveBeenCalled();
    });

    it('debe propagar un error cuando falla findBy', async () => {
      const cutoff = new Date();

      managerMock.query.mockResolvedValue([{ id: 10 }]);

      repoMock.findBy.mockRejectedValue(new Error('Find Error'));

      await expect(repository.findSensoresInactivos(cutoff)).rejects.toThrow(
        'Find Error',
      );

      expect(repoMock.findBy).toHaveBeenCalledWith({
        id: In([10]),
      });
    });
  });
});
