import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogRepository } from '../repository/audit-log.repository';
import { AuditLog } from '../entity/audit-log.entity';
import { ROLES } from '../../rol/constants/roles.constants';
import type { TenantContext } from '../../../common/types/tenant-context.type';

describe('AuditLogRepository', () => {
  let repository: AuditLogRepository;

  const mockQueryBuilder = {
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
  };

  const mockTypeOrmRepo = {
    create: jest.fn((dto) => ({ ...dto })),
    save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const tenantAdmin: TenantContext = {
    empresaId: null,
    rolNombre: ROLES.ADMINISTRADOR,
  } as any;

  const tenantOperador: TenantContext = {
    empresaId: 100,
    rolNombre: 'OPERADOR',
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogRepository,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockTypeOrmRepo,
        },
      ],
    }).compile();

    repository = module.get<AuditLogRepository>(AuditLogRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('debe crear y guardar una nueva entrada de auditoría formateando nulos como undefined', async () => {
      const createData = {
        accion: 'LOTE_CREAR_SUCCESS',
        entidad: 'Lote',
        tipo: 'OPERACION',
        userId: 10,
        empresaId: 100,
        entidadId: null,
        detalle: null,
      } as any;

      const resultado = await repository.create(createData);

      expect(mockTypeOrmRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'LOTE_CREAR_SUCCESS',
          userId: 10,
          empresaId: 100,
          entidadId: undefined,
          detalle: undefined,
        }),
      );
      expect(mockTypeOrmRepo.save).toHaveBeenCalled();
      expect(resultado.id).toBe(1);
    });
  });

  describe('findFiltered', () => {
    it('debe omitir el filtro de empresaId si el rol del tenant es ADMINISTRADOR', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await repository.findFiltered(tenantAdmin, {}, 0, 10);

      expect(mockTypeOrmRepo.createQueryBuilder).toHaveBeenCalledWith('log');
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        'log.empresaId = :empresaId',
        expect.any(Object),
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('debe aplicar el filtro de empresaId si el usuario NO es ADMINISTRADOR', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await repository.findFiltered(tenantOperador, {}, 0, 10);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'log.empresaId = :empresaId',
        { empresaId: 100 },
      );
    });

    it('debe aplicar filtros por userId, tipo, accion y rango de fechas cuando se especifican', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      const fechaDesde = new Date('2026-01-01');
      const fechaHasta = new Date('2026-05-10');

      const filters = {
        userId: 5,
        tipo: 'CONFIGURACION' as Parameters<
          AuditLogRepository['findFiltered']
        >[1]['tipo'],
        accion: 'PARAMETRO_UPDATE',
        estado: 'SUCCESS' as const,
        fechaDesde,
        fechaHasta,
      };

      await repository.findFiltered(tenantOperador, filters, 0, 10);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'log.userId = :userId',
        { userId: 5 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'log.tipo = :tipo',
        { tipo: 'CONFIGURACION' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'log.accion = :accionExacta',
        { accionExacta: 'PARAMETRO_UPDATE_SUCCESS' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'log.createdAt >= :fechaDesde',
        { fechaDesde },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'log.createdAt <= :fechaHasta',
        { fechaHasta },
      );
    });
  });

  describe('findAllMatching', () => {
    it('debe consultar registros limitando el resultado al máximo permitido para exportación (10000)', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const resultado = await repository.findAllMatching(tenantAdmin, {});

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10000);
      expect(resultado).toEqual([]);
    });
  });

  describe('findPrimerosYUltimos', () => {
    it('debe retornar arreglo vacío inmediatamente si el arreglo de entidadIds está vacío', async () => {
      const resultado = await repository.findPrimerosYUltimos('Lote', [], 100);

      expect(resultado).toEqual([]);
      expect(mockTypeOrmRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('debe construir la consulta filtrando por entidad, IDs y sufijo SUCCESS', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await repository.findPrimerosYUltimos('Lote', [10, 20], 100);

      expect(mockTypeOrmRepo.createQueryBuilder).toHaveBeenCalledWith('log');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'log.entidad = :entidad',
        { entidad: 'Lote' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'log.entidadId IN (:...entidadIds)',
        { entidadIds: [10, 20] },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "log.accion LIKE '%\\_SUCCESS' ESCAPE '\\'",
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'log.empresaId = :empresaId',
        { empresaId: 100 },
      );
    });
  });
});