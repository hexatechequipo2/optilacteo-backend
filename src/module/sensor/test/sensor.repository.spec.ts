import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorRepository } from '../repository/sensor.repository';
import { Sensor } from '../entities/sensor.entity';
import { SensorFilterQueryDto } from '../dto/sensor-filter-query.dto';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */

describe('SensorRepository', () => {
  let repository: SensorRepository;
  let typeormRepoMock: jest.Mocked<Repository<Sensor>>;
  let queryBuilderMock: any;

  beforeEach(async () => {
    queryBuilderMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    typeormRepoMock = {
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
    } as unknown as jest.Mocked<Repository<Sensor>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensorRepository,
        {
          provide: getRepositoryToken(Sensor),
          useValue: typeormRepoMock,
        },
      ],
    }).compile();

    repository = module.get<SensorRepository>(SensorRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('debe guardar y retornar una instancia de Sensor', async () => {
      const sensorMock = { id: 1, nombre: 'Sensor 1' } as Sensor;
      typeormRepoMock.save.mockResolvedValue(sensorMock);

      const result = await repository.create(sensorMock);

      expect(typeormRepoMock.save).toHaveBeenCalledWith(sensorMock);
      expect(result).toBe(sensorMock);
    });
  });

  describe('findAll', () => {
    const empresaId = 10;

    it('debe buscar sensores filtrando solo por empresaId si el filtro está vacío', async () => {
      const filter: SensorFilterQueryDto = {};
      const expectedSensores = [{ id: 1 }, { id: 2 }] as Sensor[];

      queryBuilderMock.getMany.mockResolvedValue(expectedSensores);

      const result = await repository.findAll(filter, empresaId);

      expect(typeormRepoMock.createQueryBuilder).toHaveBeenCalledWith('sensor');
      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        'sensor.empresaId = :empresaId',
        { empresaId },
      );
      expect(queryBuilderMock.andWhere).not.toHaveBeenCalled();
      expect(result).toBe(expectedSensores);
    });

    it('debe aplicar todos los filtros opcionales en el QueryBuilder si están presentes', async () => {
      const filter: SensorFilterQueryDto = {
        nombre: 'Temp',
        tipo: 'ANALOGICO' as any,
        parametro: 'TEMPERATURA' as any,
        estado: 'ACTIVO' as any,
        ubicacion: 'Cámara 1' as any,
      };

      queryBuilderMock.getMany.mockResolvedValue([]);

      await repository.findAll(filter, empresaId);

      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        'sensor.empresaId = :empresaId',
        { empresaId },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'sensor.nombre ILIKE :nombre',
        { nombre: '%Temp%' },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'sensor.tipo = :tipo',
        { tipo: 'ANALOGICO' },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'sensor.parametro = :parametro',
        { parametro: 'TEMPERATURA' },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'sensor.estado = :estado',
        { estado: 'ACTIVO' },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'sensor.ubicacion = :ubicacion',
        { ubicacion: 'Cámara 1' },
      );
    });
  });

  describe('findOne', () => {
    it('debe buscar un sensor por id y empresaId', async () => {
      const id = 1;
      const empresaId = 10;
      const sensorMock = { id, empresaId } as Sensor;

      typeormRepoMock.findOne.mockResolvedValue(sensorMock);

      const result = await repository.findOne(id, empresaId);

      expect(typeormRepoMock.findOne).toHaveBeenCalledWith({
        where: { id, empresaId },
      });
      expect(result).toBe(sensorMock);
    });

    it('debe devolver null si el sensor no existe', async () => {
      typeormRepoMock.findOne.mockResolvedValue(null);

      const result = await repository.findOne(99, 10);

      expect(result).toBeNull();
    });
  });

  describe('findByNombre', () => {
    it('debe buscar un sensor por nombre y empresaId', async () => {
      const nombre = 'Sensor Temp 1';
      const empresaId = 10;
      const sensorMock = { id: 1, nombre, empresaId } as Sensor;

      typeormRepoMock.findOne.mockResolvedValue(sensorMock);

      const result = await repository.findByNombre(nombre, empresaId);

      expect(typeormRepoMock.findOne).toHaveBeenCalledWith({
        where: { nombre, empresaId },
      });
      expect(result).toBe(sensorMock);
    });
  });

  describe('save', () => {
    it('debe guardar cambios en una entidad existente y retornarla', async () => {
      const sensorMock = { id: 1, nombre: 'Sensor Modificado' } as Sensor;
      typeormRepoMock.save.mockResolvedValue(sensorMock);

      const result = await repository.save(sensorMock);

      expect(typeormRepoMock.save).toHaveBeenCalledWith(sensorMock);
      expect(result).toBe(sensorMock);
    });
  });

  describe('remove', () => {
    it('debe remover el sensor llamando a typeormRepo.remove', async () => {
      const sensorMock = { id: 1, nombre: 'Sensor a eliminar' } as Sensor;
      typeormRepoMock.remove.mockResolvedValue(sensorMock);

      await repository.remove(sensorMock);

      expect(typeormRepoMock.remove).toHaveBeenCalledWith(sensorMock);
    });
  });
});
