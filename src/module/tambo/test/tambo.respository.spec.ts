import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TamboRepository } from '../repository/tambo.repository';
import { Tambo } from '../entities/tambo.entity';

/* eslint-disable @typescript-eslint/unbound-method */

describe('TamboRepository', () => {
  let repository: TamboRepository;
  let typeOrmRepo: jest.Mocked<Repository<Tambo>>;

  const mockTypeOrmRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TamboRepository,
        {
          provide: getRepositoryToken(Tambo),
          useValue: mockTypeOrmRepo,
        },
      ],
    }).compile();

    repository = module.get<TamboRepository>(TamboRepository);
    typeOrmRepo = module.get(getRepositoryToken(Tambo));
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('debe delegar la creación de la entidad al repositorio de TypeORM', () => {
      const partialData: Partial<Tambo> = {
        nombre: 'Tambo San Antonio',
        empresaId: 10,
        proveedorId: 5,
      };
      const entity = { id: 1, ...partialData } as Tambo;

      mockTypeOrmRepo.create.mockReturnValue(entity);

      const result = repository.create(partialData);

      expect(typeOrmRepo.create).toHaveBeenCalledWith(partialData);
      expect(result).toEqual(entity);
    });
  });

  describe('save', () => {
    it('debe guardar la entidad usando el repositorio de TypeORM', async () => {
      const tambo = { id: 1, nombre: 'Tambo San Antonio' } as Tambo;
      mockTypeOrmRepo.save.mockResolvedValue(tambo);

      const result = await repository.save(tambo);

      expect(typeOrmRepo.save).toHaveBeenCalledWith(tambo);
      expect(result).toEqual(tambo);
    });
  });

  describe('findById', () => {
    it('debe buscar un tambo por ID, empresaId e incluir la relación proveedor', async () => {
      const tamboMock = {
        id: 1,
        nombre: 'Tambo San Antonio',
        empresaId: 10,
        proveedor: { id: 5, razonSocial: 'Lácteos S.A.' },
      } as Tambo;

      mockTypeOrmRepo.findOne.mockResolvedValue(tamboMock);

      const result = await repository.findById(1, 10);

      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1, empresaId: 10 },
        relations: { proveedor: true },
      });
      expect(result).toEqual(tamboMock);
    });

    it('debe retornar null si no encuentra el tambo', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findById(999, 10);

      expect(typeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: 999, empresaId: 10 },
        relations: { proveedor: true },
      });
      expect(result).toBeNull();
    });
  });

  describe('findAllByEmpresa', () => {
    it('debe buscar tambos activos por empresaId ordenados alfabéticamente por nombre', async () => {
      const listMock = [
        { id: 1, nombre: 'Tambo A', empresaId: 10, activo: true },
        { id: 2, nombre: 'Tambo B', empresaId: 10, activo: true },
      ] as Tambo[];

      mockTypeOrmRepo.find.mockResolvedValue(listMock);

      const result = await repository.findAllByEmpresa(10);

      expect(typeOrmRepo.find).toHaveBeenCalledWith({
        where: { empresaId: 10, activo: true },
        order: { nombre: 'ASC' },
      });
      expect(result).toEqual(listMock);
    });
  });

  describe('findByProveedor', () => {
    it('debe buscar tambos activos por proveedorId y empresaId ordenados por nombre', async () => {
      const listMock = [
        {
          id: 1,
          nombre: 'Tambo San Antonio',
          proveedorId: 5,
          empresaId: 10,
          activo: true,
        },
      ] as Tambo[];

      mockTypeOrmRepo.find.mockResolvedValue(listMock);

      const result = await repository.findByProveedor(5, 10);

      expect(typeOrmRepo.find).toHaveBeenCalledWith({
        where: { proveedorId: 5, empresaId: 10, activo: true },
        order: { nombre: 'ASC' },
      });
      expect(result).toEqual(listMock);
    });
  });
});
