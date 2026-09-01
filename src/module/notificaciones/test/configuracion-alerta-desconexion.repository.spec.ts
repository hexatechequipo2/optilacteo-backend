import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionAlertaDesconexionRepository } from '../repository/configuracion-alerta-desconexion.repository';
import { ConfiguracionAlertaDesconexion } from '../entities/configuracion-alerta-desconexion.entity';

/* eslint-disable @typescript-eslint/unbound-method */

describe('ConfiguracionAlertaDesconexionRepository', () => {
  let repository: ConfiguracionAlertaDesconexionRepository;
  let typeOrmRepository: jest.Mocked<
    Repository<ConfiguracionAlertaDesconexion>
  >;

  const mockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfiguracionAlertaDesconexionRepository,
        {
          provide: getRepositoryToken(ConfiguracionAlertaDesconexion),
          useValue: mockRepo,
        },
      ],
    }).compile();

    repository = module.get<ConfiguracionAlertaDesconexionRepository>(
      ConfiguracionAlertaDesconexionRepository,
    );
    typeOrmRepository = module.get(
      getRepositoryToken(ConfiguracionAlertaDesconexion),
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('findByEmpresa: debe buscar por empresaId', async () => {
    const mockData = {
      id: 1,
      empresaId: 10,
      umbralMinutos: 15,
    } as ConfiguracionAlertaDesconexion;
    typeOrmRepository.findOne.mockResolvedValue(mockData);

    const result = await repository.findByEmpresa(10);

    expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
      where: { empresaId: 10 },
    });
    expect(result).toEqual(mockData);
  });

  it('save: debe guardar la entidad', async () => {
    const mockData = {
      empresaId: 10,
      umbralMinutos: 15,
    } as ConfiguracionAlertaDesconexion;
    typeOrmRepository.save.mockResolvedValue({ ...mockData, id: 1 });

    const result = await repository.save(mockData);

    expect(typeOrmRepository.save).toHaveBeenCalledWith(mockData);
    expect(result.id).toBe(1);
  });
});
