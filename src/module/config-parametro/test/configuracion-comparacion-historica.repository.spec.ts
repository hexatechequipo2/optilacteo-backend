import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ConfiguracionComparacionHistoricaRepository } from '../repository/configuracion-comparacion-historica.repository';
import { ConfiguracionComparacionHistorica } from '../entities/configuracion-comparacion-historica.entity';
/* eslint-disable @typescript-eslint/unbound-method */

describe('ConfiguracionComparacionHistoricaRepository', () => {
  let repository: ConfiguracionComparacionHistoricaRepository;
  let typeOrmRepository: jest.Mocked<
    Repository<ConfiguracionComparacionHistorica>
  >;

  const repositoryMock = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfiguracionComparacionHistoricaRepository,
        {
          provide: getRepositoryToken(ConfiguracionComparacionHistorica),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    repository = module.get<ConfiguracionComparacionHistoricaRepository>(
      ConfiguracionComparacionHistoricaRepository,
    );

    typeOrmRepository = module.get(
      getRepositoryToken(ConfiguracionComparacionHistorica),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('findByEmpresa', () => {
    it('cuando se consulta una empresa, debe buscar la configuración histórica correspondiente', async () => {
      const entity = new ConfiguracionComparacionHistorica();
      repositoryMock.findOne.mockResolvedValue(entity);

      const result = await repository.findByEmpresa(8);

      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: {
          empresaId: 8,
        },
      });

      expect(result).toBe(entity);
    });
  });

  describe('save', () => {
    it('cuando se guarda una configuración histórica, debe delegar el guardado al repositorio', async () => {
      const entity = new ConfiguracionComparacionHistorica();
      repositoryMock.save.mockResolvedValue(entity);

      const result = await repository.save(entity);

      expect(typeOrmRepository.save).toHaveBeenCalledWith(entity);
      expect(result).toBe(entity);
    });
  });

  describe('create', () => {
    it('cuando se crea una configuración histórica, debe construir la entidad utilizando el repositorio', () => {
      const data: Partial<ConfiguracionComparacionHistorica> = {
        empresaId: 3,
        desvioSignificativoPorcentaje: 15,
        cantidadRegistrosHistoricos: 20,
      };

      const entity = new ConfiguracionComparacionHistorica();

      repositoryMock.create.mockReturnValue(entity);

      const result = repository.create(data);

      expect(typeOrmRepository.create).toHaveBeenCalledWith(data);
      expect(result).toBe(entity);
    });
  });
});
