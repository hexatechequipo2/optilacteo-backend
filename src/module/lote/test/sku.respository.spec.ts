import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkuRepository } from '../repository/sku.repository';
import { Sku } from '../entities/sku.entity';

describe('SkuRepository', () => {
  let repository: SkuRepository;
  let typeormRepo: jest.Mocked<Repository<Sku>>;

  const mockTypeormRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkuRepository,
        {
          provide: getRepositoryToken(Sku),
          useValue: mockTypeormRepository,
        },
      ],
    }).compile();

    repository = module.get<SkuRepository>(SkuRepository);
    typeormRepo = module.get(getRepositoryToken(Sku));
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('cuando se crea una instancia de SKU, debe invocar repo.create con los valores recibidos', () => {
      const partialData: Partial<Sku> = { nombre: 'Leche Entera', empresaId: 1 };
      const expectedSku = { id: 1, ...partialData } as Sku;
      typeormRepo.create.mockReturnValue(expectedSku);

      const resultado = repository.create(partialData);

      expect(typeormRepo.create).toHaveBeenCalledWith(partialData);
      expect(resultado).toEqual(expectedSku);
    });
  });

  describe('save', () => {
    it('cuando se guarda un SKU, debe persistir el registro via repo.save', async () => {
      const mockSku = { id: 1, nombre: 'Queso Barra' } as Sku;
      typeormRepo.save.mockResolvedValue(mockSku);

      const resultado = await repository.save(mockSku);

      expect(typeormRepo.save).toHaveBeenCalledWith(mockSku);
      expect(resultado).toEqual(mockSku);
    });
  });

  describe('findById', () => {
    it('cuando se busca por id y empresaId, debe consultar repo.findOne validando el tenant', async () => {
      const mockSku = { id: 5, empresaId: 1 } as Sku;
      typeormRepo.findOne.mockResolvedValue(mockSku);

      const resultado = await repository.findById(5, 1);

      expect(typeormRepo.findOne).toHaveBeenCalledWith({
        where: { id: 5, empresaId: 1 },
      });
      expect(resultado).toEqual(mockSku);
    });
  });

  describe('findByNombre', () => {
    it('cuando se busca un SKU por nombre y empresa, debe filtrar por ambos criterios', async () => {
      const mockSku = { id: 2, nombre: 'Crema de Leche', empresaId: 1 } as Sku;
      typeormRepo.findOne.mockResolvedValue(mockSku);

      const resultado = await repository.findByNombre('Crema de Leche', 1);

      expect(typeormRepo.findOne).toHaveBeenCalledWith({
        where: { nombre: 'Crema de Leche', empresaId: 1 },
      });
      expect(resultado).toEqual(mockSku);
    });
  });

  describe('findAllActivosByEmpresa', () => {
    it('cuando se obtienen los SKUs activos de la empresa, debe filtrar por tenant e indicativo activo, ordenados alfabéticamente', async () => {
      const mockSkus = [
        { id: 1, nombre: 'Manteca', activo: true, empresaId: 1 },
        { id: 2, nombre: 'Yogurt', activo: true, empresaId: 1 },
      ] as Sku[];
      typeormRepo.find.mockResolvedValue(mockSkus);

      const resultado = await repository.findAllActivosByEmpresa(1);

      expect(typeormRepo.find).toHaveBeenCalledWith({
        where: { empresaId: 1, activo: true },
        order: { nombre: 'ASC' },
      });
      expect(resultado).toEqual(mockSkus);
    });
  });
});