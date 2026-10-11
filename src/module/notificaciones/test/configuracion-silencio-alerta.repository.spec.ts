import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ConfiguracionSilencioRepository } from '../repository/configuracion-silencio-alerta.repository';
import { ConfiguracionSilencioAlerta } from '../entities/configuracion-silencio-alerta.entity';

describe('ConfiguracionSilencioRepository', () => {
  let repository: ConfiguracionSilencioRepository;
  let typeormRepository: jest.Mocked<
    Pick<Repository<ConfiguracionSilencioAlerta>,
      'find' | 'findOne' | 'create' | 'save' | 'delete'>
  >;

  const configuracion = {
    id: 1,
    empresaId: 10,
    horaInicio: '22:00',
    horaFin: '06:00',
  } as ConfiguracionSilencioAlerta;

  beforeEach(async () => {
    const mockTypeormRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfiguracionSilencioRepository,
        {
          provide: getRepositoryToken(ConfiguracionSilencioAlerta),
          useValue: mockTypeormRepository,
        },
      ],
    }).compile();

    repository = module.get<ConfiguracionSilencioRepository>(
      ConfiguracionSilencioRepository,
    );

    typeormRepository = module.get(getRepositoryToken(ConfiguracionSilencioAlerta));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmpresa', () => {
    it('debe buscar las configuraciones de la empresa ordenadas por hora de inicio', async () => {
      typeormRepository.find.mockResolvedValue([configuracion]);

      const resultado = await repository.findByEmpresa(10);

      expect(resultado).toEqual([configuracion]);
      expect(typeormRepository.find).toHaveBeenCalledWith({
        where: { empresaId: 10 },
        order: { horaInicio: 'ASC' },
      });
    });

    it('debe devolver un array vacío cuando no hay configuraciones', async () => {
      typeormRepository.find.mockResolvedValue([]);

      const resultado = await repository.findByEmpresa(10);

      expect(resultado).toEqual([]);
    });
  });

  describe('findById', () => {
    it('debe buscar por id y empresa', async () => {
      typeormRepository.findOne.mockResolvedValue(configuracion);

      const resultado = await repository.findById(1, 10);

      expect(resultado).toBe(configuracion);
      expect(typeormRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, empresaId: 10 },
      });
    });

    it('debe devolver null si no encuentra la configuración', async () => {
      typeormRepository.findOne.mockResolvedValue(null);

      const resultado = await repository.findById(999, 10);

      expect(resultado).toBeNull();
    });
  });

  describe('create', () => {
    it('debe crear y guardar la configuración', async () => {
      const data = {
        empresaId: 10,
        horaInicio: '23:00',
        horaFin: '05:00',
      } as Partial<ConfiguracionSilencioAlerta>;

      const entidadCreada = {
        ...data,
      } as ConfiguracionSilencioAlerta;

      typeormRepository.create.mockReturnValue(entidadCreada);
      typeormRepository.save.mockResolvedValue(configuracion);

      const resultado = await repository.create(data);

      expect(typeormRepository.create).toHaveBeenCalledWith(data);
      expect(typeormRepository.save).toHaveBeenCalledWith(entidadCreada);
      expect(resultado).toBe(configuracion);
    });
  });

  describe('update', () => {
    it('debe devolver null si la configuración no existe', async () => {
      typeormRepository.findOne.mockResolvedValue(null);

      const resultado = await repository.update(999, 10, {
        horaInicio: '21:00',
      });

      expect(resultado).toBeNull();
      expect(typeormRepository.save).not.toHaveBeenCalled();
    });

    it('debe actualizar y guardar la configuración existente', async () => {
      const existente = {
        id: 1,
        empresaId: 10,
        horaInicio: '22:00',
        horaFin: '06:00',
      } as ConfiguracionSilencioAlerta;

      const data = {
        horaInicio: '21:00',
        horaFin: '05:00',
      };

      typeormRepository.findOne.mockResolvedValue(existente);
      typeormRepository.save.mockImplementation(async (entity) =>
        entity as ConfiguracionSilencioAlerta,
      );

      const resultado = await repository.update(1, 10, data);

      expect(typeormRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, empresaId: 10 },
      });
      expect(existente.horaInicio).toBe('21:00');
      expect(existente.horaFin).toBe('05:00');
      expect(typeormRepository.save).toHaveBeenCalledWith(existente);
      expect(resultado).toBe(existente);
    });
  });

  describe('delete', () => {
    it('debe devolver true cuando se elimina una fila', async () => {
      typeormRepository.delete.mockResolvedValue({
        affected: 1,
        raw: [],
      });

      const resultado = await repository.delete(1, 10);

      expect(resultado).toBe(true);
      expect(typeormRepository.delete).toHaveBeenCalledWith({
        id: 1,
        empresaId: 10,
      });
    });

    it('debe devolver false cuando no se elimina ninguna fila', async () => {
      typeormRepository.delete.mockResolvedValue({
        affected: 0,
        raw: [],
      });

      const resultado = await repository.delete(999, 10);

      expect(resultado).toBe(false);
    });

    it('debe devolver false cuando affected es undefined', async () => {
      typeormRepository.delete.mockResolvedValue({
        affected: undefined,
        raw: [],
      });

      const resultado = await repository.delete(999, 10);

      expect(resultado).toBe(false);
    });
  });
});
