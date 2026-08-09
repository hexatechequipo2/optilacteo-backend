import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SensorEventoRepository } from '../repository/sensor-evento.repository';
import { SensorEvento } from '../entities/sensor-evento.entity';
/* eslint-disable @typescript-eslint/unbound-method */

describe('SensorEventoRepository', () => {
  let repository: SensorEventoRepository;
  let typeormRepository: jest.Mocked<Repository<SensorEvento>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensorEventoRepository,
        {
          provide: getRepositoryToken(SensorEvento),
          useValue: {
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<SensorEventoRepository>(SensorEventoRepository);
    typeormRepository = module.get(getRepositoryToken(SensorEvento));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('debe guardar un evento correctamente', async () => {
      const evento = {
        id: 1,
        sensorId: 5,
        empresaId: 10,
      } as SensorEvento;

      typeormRepository.save.mockResolvedValue(evento);

      const result = await repository.create(evento);

      expect(typeormRepository.save).toHaveBeenCalledWith(evento);
      expect(result).toBe(evento);
    });

    it('debe propagar el error cuando save falla', async () => {
      const evento = {} as SensorEvento;

      typeormRepository.save.mockRejectedValue(new Error('DB Error'));

      await expect(repository.create(evento)).rejects.toThrow('DB Error');

      expect(typeormRepository.save).toHaveBeenCalledWith(evento);
    });
  });
});
