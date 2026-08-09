import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between, Not } from 'typeorm';
import { LoteRepository } from '../repository/lote.repository';
import { Lote } from '../entities/lote.entity';
import { EstadoLote } from '../enums/estado-lote.enum';
import { ClasificacionLote } from '../enums/clasificacion-lote.enum';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';

describe('LoteRepository', () => {
  let repository: LoteRepository;
  let typeormRepoMock: jest.Mocked<Repository<Lote>>;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoteRepository,
        {
          provide: getRepositoryToken(Lote),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            count: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    repository = module.get<LoteRepository>(LoteRepository);
    typeormRepoMock = module.get(getRepositoryToken(Lote));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('debe llamar a repository.create con los datos provistos', () => {
      const partialLote: Partial<Lote> = { codigo: 'L-001' };
      const expectedLote = { ...partialLote } as Lote;
      typeormRepoMock.create.mockReturnValue(expectedLote);

      const resultado = repository.create(partialLote);

      expect(typeormRepoMock.create).toHaveBeenCalledWith(partialLote);
      expect(resultado).toBe(expectedLote);
    });
  });

  describe('save', () => {
    it('debe guardar y retornar la entidad lote', async () => {
      const mockLote = { id: 1, codigo: 'L-001' } as Lote;
      typeormRepoMock.save.mockResolvedValue(mockLote);

      const resultado = await repository.save(mockLote);

      expect(typeormRepoMock.save).toHaveBeenCalledWith(mockLote);
      expect(resultado).toBe(mockLote);
    });
  });

  describe('findById', () => {
    it('debe buscar un lote por ID y empresaId relacionando parametros', async () => {
      const mockLote = { id: 10, empresaId: 2 } as Lote;
      typeormRepoMock.findOne.mockResolvedValue(mockLote);

      const resultado = await repository.findById(10, 2);

      expect(typeormRepoMock.findOne).toHaveBeenCalledWith({
        where: { id: 10, empresaId: 2 },
        relations: { parametros: true },
      });
      expect(resultado).toBe(mockLote);
    });
  });

  describe('findByCodigo', () => {
    it('debe buscar un lote por código y empresaId', async () => {
      const mockLote = { id: 1, codigo: 'LOT-123', empresaId: 5 } as Lote;
      typeormRepoMock.findOne.mockResolvedValue(mockLote);

      const resultado = await repository.findByCodigo('LOT-123', 5);

      expect(typeormRepoMock.findOne).toHaveBeenCalledWith({
        where: { codigo: 'LOT-123', empresaId: 5 },
      });
      expect(resultado).toBe(mockLote);
    });
  });

  describe('findAll', () => {
    it('debe aplicar paginación por defecto si no se especifican page ni limit', async () => {
      const mockResult: [Lote[], number] = [[], 0];
      typeormRepoMock.findAndCount.mockResolvedValue(mockResult);

      const resultado = await repository.findAll({}, 1);

      expect(typeormRepoMock.findAndCount).toHaveBeenCalledWith({
        where: { empresaId: 1 },
        relations: { parametros: true },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(resultado).toBe(mockResult);
    });

    it('debe construir el objeto where con todos los filtros cuando se proveen', async () => {
      const fechaDesde = '2026-07-01T00:00:00Z';
      const fechaHasta = '2026-07-31T23:59:59Z';
      const query = {
        page: 2,
        limit: 10,
        estado: EstadoLote.EN_PROCESO,
        clasificacion: ClasificacionLote.APTO,
        proveedorId: 99,
        fechaDesde,
        fechaHasta,
      };

      const mockLotes = [{ id: 1 }] as Lote[];
      typeormRepoMock.findAndCount.mockResolvedValue([mockLotes, 1]);

      const resultado = await repository.findAll(query, 10);

      expect(typeormRepoMock.findAndCount).toHaveBeenCalledWith({
        where: {
          empresaId: 10,
          estado: EstadoLote.EN_PROCESO,
          clasificacion: ClasificacionLote.APTO,
          proveedorId: 99,
          fechaIngreso: Between(new Date(fechaDesde), new Date(fechaHasta)),
        },
        relations: { parametros: true },
        order: { createdAt: 'DESC' },
        skip: 10, // (2 - 1) * 10
        take: 10,
      });
      expect(resultado).toEqual([mockLotes, 1]);
    });

    it('no debe aplicar filtro de fechaIngreso si solo se pasa una de las dos fechas', async () => {
      const query = { fechaDesde: '2026-07-01T00:00:00Z' }; // fechaHasta indefinida
      typeormRepoMock.findAndCount.mockResolvedValue([[], 0]);

      await repository.findAll(query, 1);

      expect(typeormRepoMock.findAndCount).toHaveBeenCalledWith({
        where: { empresaId: 1 },
        relations: { parametros: true },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('countByEmpresa', () => {
    it('debe retornar la cantidad de lotes registrados para una empresa', async () => {
      typeormRepoMock.count.mockResolvedValue(42);

      const resultado = await repository.countByEmpresa(3);

      expect(typeormRepoMock.count).toHaveBeenCalledWith({
        where: { empresaId: 3 },
      });
      expect(resultado).toBe(42);
    });
  });

  describe('findNoAptosSinRevisionVigente', () => {
    it('debe ejecutar la query para obtener lotes no aptos sin revisión vigente', async () => {
      const mockLotes = [{ id: 10 }, { id: 20 }] as Lote[];
      mockQueryBuilder.getMany.mockResolvedValue(mockLotes);

      const resultado = await repository.findNoAptosSinRevisionVigente(5);

      expect(typeormRepoMock.createQueryBuilder).toHaveBeenCalledWith('lote');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'lote.parametros',
        'parametros',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'lote.empresaId = :empresaId',
        { empresaId: 5 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'lote.clasificacion = :clasificacion',
        { clasificacion: 'no_apto' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('NOT EXISTS'),
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'lote.createdAt',
        'DESC',
      );
      expect(resultado).toEqual(mockLotes);
    });
  });

  describe('findUltimosAptos', () => {
    it('debe buscar los últimos lotes aptos excluyendo un ID específico', async () => {
      const mockLotes = [{ id: 1 }, { id: 2 }] as Lote[];
      typeormRepoMock.find.mockResolvedValue(mockLotes);

      const resultado = await repository.findUltimosAptos(
        5,
        'leche_entera' as unknown as TipoMateriaPrima,
        3,
        100, // excluirLoteId
      );

      expect(typeormRepoMock.find).toHaveBeenCalledWith({
        where: {
          empresaId: 5,
          materiaPrima: 'leche_entera' as TipoMateriaPrima,
          clasificacion: ClasificacionLote.APTO,
          id: Not(100),
        },
        relations: { parametros: true },
        order: { createdAt: 'DESC' },
        take: 3,
      });
      expect(resultado).toEqual(mockLotes);
    });
  });
});
