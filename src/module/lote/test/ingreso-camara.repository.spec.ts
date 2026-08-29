import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngresoCamaraRepository } from '../repository/ingreso-camara.repository';
import { IngresoCamara } from '../entities/ingreso-camara.entity';

describe('IngresoCamaraRepository', () => {
  let repository: IngresoCamaraRepository;
  let typeormRepo: jest.Mocked<Repository<IngresoCamara>>;

  // Mock dinámico para el QueryBuilder de TypeORM
  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockTypeormRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngresoCamaraRepository,
        {
          provide: getRepositoryToken(IngresoCamara),
          useValue: mockTypeormRepository,
        },
      ],
    }).compile();

    repository = module.get<IngresoCamaraRepository>(IngresoCamaraRepository);
    typeormRepo = module.get(getRepositoryToken(IngresoCamara));
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('cuando se instancia un ingreso a cámara, debe llamar a repo.create con los datos parciales', () => {
      const partialData: Partial<IngresoCamara> = {
        cantidad: 100,
        skuId: 1,
      };
      const expectedEntity = { id: 1, ...partialData } as IngresoCamara;
      typeormRepo.create.mockReturnValue(expectedEntity);

      const resultado = repository.create(partialData);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(typeormRepo.create).toHaveBeenCalledWith(partialData);
      expect(resultado).toEqual(expectedEntity);
    });
  });

  describe('save', () => {
    it('cuando se guarda un ingreso a cámara, debe llamar a repo.save y retornar la entidad persistida', async () => {
      const mockIngreso = { id: 1, cantidad: 100 } as IngresoCamara;
      typeormRepo.save.mockResolvedValue(mockIngreso);

      const resultado = await repository.save(mockIngreso);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(typeormRepo.save).toHaveBeenCalledWith(mockIngreso);
      expect(resultado).toEqual(mockIngreso);
    });
  });

  describe('findById', () => {
    it('cuando se busca por id y empresaId, debe consultar la BD aplicando el aislamiento tenant y las relaciones requeridas', async () => {
      const mockIngreso = { id: 10, empresaId: 1 } as IngresoCamara;
      typeormRepo.findOne.mockResolvedValue(mockIngreso);

      const resultado = await repository.findById(10, 1);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(typeormRepo.findOne).toHaveBeenCalledWith({
        where: { id: 10, empresaId: 1 },
        relations: { sku: true, lote: true },
      });
      expect(resultado).toEqual(mockIngreso);
    });
  });

  describe('findAll', () => {
    it('cuando se consulta sin filtros específicos, debe aplicar la paginación por defecto y el filtro de tenant', async () => {
      const mockIngresos = [{ id: 1 }, { id: 2 }] as IngresoCamara[];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockIngresos, 2]);

      const resultado = await repository.findAll({}, 1);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(typeormRepo.createQueryBuilder).toHaveBeenCalledWith('ingreso');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'ingreso.sku',
        'sku',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'ingreso.lote',
        'lote',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'ingreso.empresaId = :empresaId',
        { empresaId: 1 },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'ingreso.fechaIngreso',
        'DESC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0); // (page 1 - 1) * 20
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(resultado).toEqual([mockIngresos, 2]);
    });

    it('cuando se envían filtros de página, límite y skuId, debe encadenar las cláusulas andWhere y offset correspondiente', async () => {
      const query = { page: 2, limit: 10, skuId: 5 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await repository.findAll(query, 1);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10); // (page 2 - 1) * 10
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'ingreso.skuId = :skuId',
        { skuId: 5 },
      );
    });
  });
});
