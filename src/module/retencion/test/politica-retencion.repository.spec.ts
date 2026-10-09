import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PoliticaRetencionRepository } from '../repository/politica-retencion.repository';
import { PoliticaRetencion } from '../entities/politica-retencion.entity';

describe('PoliticaRetencionRepository', () => {
  let repository: PoliticaRetencionRepository;

  const mockTypeOrmRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliticaRetencionRepository,
        {
          provide: getRepositoryToken(PoliticaRetencion),
          useValue: mockTypeOrmRepository,
        },
      ],
    }).compile();

    repository = module.get<PoliticaRetencionRepository>(
      PoliticaRetencionRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('findByEmpresa', () => {
    it('debe buscar y retornar la política de retención asociada a una empresa', async () => {
      const empresaId = 100;
      const politicaMock = {
        id: 1,
        empresaId,
        retencionMeses: 24,
        diasAvisoVencimiento: 30,
      };

      mockTypeOrmRepository.findOne.mockResolvedValue(politicaMock);

      const resultado = await repository.findByEmpresa(empresaId);

      expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { empresaId },
      });
      expect(resultado).toEqual(politicaMock);
    });

    it('debe retornar null si la empresa no posee política configurada', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      const resultado = await repository.findByEmpresa(999);

      expect(resultado).toBeNull();
    });
  });

  describe('create', () => {
    it('debe invocar a typeOrmRepository.create con los datos provistos', () => {
      const dataPartial: Partial<PoliticaRetencion> = {
        empresaId: 100,
        retencionMeses: 24,
      };

      const entidadCreada = { id: 0, ...dataPartial };
      mockTypeOrmRepository.create.mockReturnValue(entidadCreada);

      const resultado = repository.create(dataPartial);

      expect(mockTypeOrmRepository.create).toHaveBeenCalledWith(dataPartial);
      expect(resultado).toEqual(entidadCreada);
    });
  });

  describe('save', () => {
    it('debe persistir la entidad invocando a typeOrmRepository.save', async () => {
      const entidad = {
        id: 1,
        empresaId: 100,
        retencionMeses: 36,
        diasAvisoVencimiento: 45,
      } as PoliticaRetencion;

      mockTypeOrmRepository.save.mockResolvedValue(entidad);

      const resultado = await repository.save(entidad);

      expect(mockTypeOrmRepository.save).toHaveBeenCalledWith(entidad);
      expect(resultado).toEqual(entidad);
    });
  });
});