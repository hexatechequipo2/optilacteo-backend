import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ConfigParametroRepository } from '../repository/config-parametro.repository';
import { ConfiguracionParametro } from '../entities/config-parametro.entity';
import { Parametro } from '../enums/parametro.enum';
import { TipoMateriaPrima } from '../enums/tipo-materia-prima-enum';
/* eslint-disable @typescript-eslint/unbound-method */

describe('ConfigParametroRepository', () => {
  let repository: ConfigParametroRepository;
  let typeOrmRepository: jest.Mocked<Repository<ConfiguracionParametro>>;

  const repositoryMock = {
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigParametroRepository,
        {
          provide: getRepositoryToken(ConfiguracionParametro),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    repository = module.get<ConfigParametroRepository>(
      ConfigParametroRepository,
    );
    typeOrmRepository = module.get(getRepositoryToken(ConfiguracionParametro));
  });

  afterEach(() => jest.clearAllMocks());

  describe('save', () => {
    it('cuando se guarda una configuración, debe delegar el guardado al repositorio', async () => {
      const entity = new ConfiguracionParametro();
      repositoryMock.save.mockResolvedValue(entity);

      const result = await repository.save(entity);

      expect(typeOrmRepository.save).toHaveBeenCalledWith(entity);
      expect(result).toBe(entity);
    });
  });

  describe('findById', () => {
    it('cuando se busca una configuración por id, debe consultar el repositorio utilizando ese id', async () => {
      const entity = new ConfiguracionParametro();
      repositoryMock.findOne.mockResolvedValue(entity);

      const result = await repository.findById(1);

      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toBe(entity);
    });
  });

  describe('findByEmpresa', () => {
    it('cuando se consulta una empresa, debe devolver todas sus configuraciones', async () => {
      const entities: ConfiguracionParametro[] = [];
      repositoryMock.find.mockResolvedValue(entities);

      const result = await repository.findByEmpresa(15);

      expect(typeOrmRepository.find).toHaveBeenCalledWith({
        where: { empresaId: 15 },
      });
      expect(result).toBe(entities);
    });
  });

  describe('findByParametroAndTipoMateriaPrima', () => {
    it('cuando se consulta por empresa, parámetro y tipo de materia prima, debe buscar utilizando los tres filtros', async () => {
      const entity = new ConfiguracionParametro();
      repositoryMock.findOne.mockResolvedValue(entity);
      const tipoMateriaPrima = 'LECHE' as TipoMateriaPrima;

      const result = await repository.findByParametroAndTipoMateriaPrima(
        5,
        Parametro.TEMPERATURA,
        tipoMateriaPrima,
      );

      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: {
          empresaId: 5,
          parametro: Parametro.TEMPERATURA,
          tipoMateriaPrima,
        },
      });

      expect(result).toBe(entity);
    });
  });

  describe('delete', () => {
    it('cuando se elimina una configuración, debe delegar la operación al repositorio', async () => {
      repositoryMock.delete.mockResolvedValue(undefined);

      await repository.delete(3);

      expect(typeOrmRepository.delete).toHaveBeenCalledWith(3);
    });
  });
});
