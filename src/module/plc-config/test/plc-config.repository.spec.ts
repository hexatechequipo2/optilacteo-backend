import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlcConfigRepository } from '../repository/plc-config.repository';
import { PlcConfig } from '../entities/plc-config.entity';
import { Sensor } from '../../sensor/entities/sensor.entity';
import { TipoSensor } from '../../sensor/enums/tipo-sensor.enum';

/* eslint-disable @typescript-eslint/unbound-method */

describe('PlcConfigRepository', () => {
  let repository: PlcConfigRepository;
  let plcConfigTypeOrmRepo: jest.Mocked<Repository<PlcConfig>>;
  let sensorTypeOrmRepo: jest.Mocked<Repository<Sensor>>;

  const mockPlcConfigRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockSensorRepo = {
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlcConfigRepository,
        {
          provide: getRepositoryToken(PlcConfig),
          useValue: mockPlcConfigRepo,
        },
        {
          provide: getRepositoryToken(Sensor),
          useValue: mockSensorRepo,
        },
      ],
    }).compile();

    repository = module.get<PlcConfigRepository>(PlcConfigRepository);
    plcConfigTypeOrmRepo = module.get(getRepositoryToken(PlcConfig));
    sensorTypeOrmRepo = module.get(getRepositoryToken(Sensor));
  });

  afterEach(() => jest.clearAllMocks());

  describe('findByEmpresa', () => {
    it('debe buscar y retornar la configuración por empresaId', async () => {
      const mockConfig = {
        id: 1,
        empresaId: 10,
        url: 'http://192.168.1.50',
      } as PlcConfig;
      plcConfigTypeOrmRepo.findOne.mockResolvedValue(mockConfig);

      const result = await repository.findByEmpresa(10);

      expect(plcConfigTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { empresaId: 10 },
      });
      expect(result).toEqual(mockConfig);
    });

    it('debe retornar null si no existe configuración para la empresa', async () => {
      plcConfigTypeOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findByEmpresa(10);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('debe instanciar y guardar una nueva configuración de PLC', async () => {
      const partialConfig = {
        empresaId: 10,
        url: 'http://192.168.1.50',
      } as PlcConfig;
      const createdEntity = { ...partialConfig, id: 1 };

      plcConfigTypeOrmRepo.create.mockReturnValue(createdEntity);
      plcConfigTypeOrmRepo.save.mockResolvedValue(createdEntity);

      const result = await repository.create(partialConfig);

      expect(plcConfigTypeOrmRepo.create).toHaveBeenCalledWith(partialConfig);
      expect(plcConfigTypeOrmRepo.save).toHaveBeenCalledWith(createdEntity);
      expect(result).toEqual(createdEntity);
    });
  });

  describe('save', () => {
    it('debe guardar/actualizar los cambios de una entidad existente', async () => {
      const configEntity = {
        id: 1,
        empresaId: 10,
        url: 'http://192.168.1.100',
      } as PlcConfig;
      plcConfigTypeOrmRepo.save.mockResolvedValue(configEntity);

      const result = await repository.save(configEntity);

      expect(plcConfigTypeOrmRepo.save).toHaveBeenCalledWith(configEntity);
      expect(result).toEqual(configEntity);
    });
  });

  describe('existsSensorDigitalOAnalogico', () => {
    it('debe verificar si existen sensores DIGITALES o ANALOGICOS para la empresa', async () => {
      sensorTypeOrmRepo.count.mockResolvedValue(2);

      const result = await repository.existsSensorDigitalOAnalogico(10);

      expect(sensorTypeOrmRepo.count).toHaveBeenCalledWith({
        where: [
          { empresaId: 10, tipo: TipoSensor.DIGITAL },
          { empresaId: 10, tipo: TipoSensor.ANALOGICO },
        ],
      });
      expect(result).toBe(true);
    });

    it('debe retornar false si no se encuentran sensores dependientes del PLC', async () => {
      sensorTypeOrmRepo.count.mockResolvedValue(0);

      const result = await repository.existsSensorDigitalOAnalogico(10);

      expect(sensorTypeOrmRepo.count).toHaveBeenCalledWith({
        where: [
          { empresaId: 10, tipo: TipoSensor.DIGITAL },
          { empresaId: 10, tipo: TipoSensor.ANALOGICO },
        ],
      });
      expect(result).toBe(false);
    });
  });
});
