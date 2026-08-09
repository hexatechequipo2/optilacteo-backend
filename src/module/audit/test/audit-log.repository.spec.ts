import { Repository } from 'typeorm';
import { AuditLogRepository } from '../repository/audit-log.repository';
import { AuditLog } from '../entity/audit-log.entity';
import { ROLES } from '../../rol/constants/roles.constants';
import type { CreateAuditLogData } from '../repository/audit-log-interface.repository';
import type { TenantContext } from '../../../common/types/tenant-context.type';

describe('AuditLogRepository', () => {
  let repository: AuditLogRepository;
  let mockTypeormRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findAndCount: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let mockQueryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    addOrderBy: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(() => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    mockTypeormRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    repository = new AuditLogRepository(
      mockTypeormRepo as unknown as Repository<AuditLog>,
    );
  });

  describe('create', () => {
    it('deberia convertir valores null a undefined antes de crear la entidad', async () => {
      const data: CreateAuditLogData = {
        userId: null,
        userEmail: 'anonymous',
        empresaId: null,
        accion: 'LOGIN_FAILURE',
        entidad: 'Usuario',
        entidadId: null,
        detalle: null,
      };
      const created = { id: 1, ...data } as unknown as AuditLog;
      mockTypeormRepo.create.mockReturnValue(created);
      mockTypeormRepo.save.mockResolvedValue(created);

      const result = await repository.create(data);

      expect(mockTypeormRepo.create).toHaveBeenCalledWith({
        ...data,
        userId: undefined,
        empresaId: undefined,
        entidadId: undefined,
        detalle: undefined,
      });
      expect(mockTypeormRepo.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });

    it('deberia preservar los valores definidos sin convertirlos', async () => {
      const data: CreateAuditLogData = {
        userId: 5,
        userEmail: 'user@lacteo.com',
        empresaId: 2,
        accion: 'PROVEEDOR_ELIMINAR_SUCCESS',
        entidad: 'Proveedor',
        entidadId: 10,
        detalle: { antes: 'ACTIVA', despues: 'SUSPENDIDA' },
      };
      const created = { id: 2, ...data } as unknown as AuditLog;
      mockTypeormRepo.create.mockReturnValue(created);
      mockTypeormRepo.save.mockResolvedValue(created);

      await repository.create(data);

      expect(mockTypeormRepo.create).toHaveBeenCalledWith(data);
    });
  });

  describe('findAllScoped', () => {
    it('para Administrador no aplica filtro de empresa', async () => {
      mockTypeormRepo.findAndCount.mockResolvedValue([[], 0]);
      const tenant: TenantContext = {
        empresaId: null,
        rolNombre: ROLES.ADMINISTRADOR,
      };

      await repository.findAllScoped(tenant, 0, 50);

      expect(mockTypeormRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 50,
      });
    });

    it('para un rol distinto de Administrador filtra por la empresa del tenant', async () => {
      mockTypeormRepo.findAndCount.mockResolvedValue([[], 0]);
      const tenant: TenantContext = { empresaId: 3, rolNombre: ROLES.GERENTE };

      await repository.findAllScoped(tenant, 10, 25);

      expect(mockTypeormRepo.findAndCount).toHaveBeenCalledWith({
        where: { empresaId: 3 },
        order: { createdAt: 'DESC' },
        skip: 10,
        take: 25,
      });
    });

    it('devuelve el resultado tal cual lo entrega TypeORM', async () => {
      const logs = [{ id: 1 }] as unknown as AuditLog[];
      mockTypeormRepo.findAndCount.mockResolvedValue([logs, 1]);
      const tenant: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };

      const result = await repository.findAllScoped(tenant, 0, 50);

      expect(result).toEqual([logs, 1]);
    });
  });

  describe('findPrimerosYUltimos', () => {
    it('deberia devolver [] sin consultar la base si entidadIds esta vacio', async () => {
      const result = await repository.findPrimerosYUltimos('Lote', [], 1);

      expect(result).toEqual([]);
      expect(mockTypeormRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('deberia armar el query con entidad, entidadIds, filtro de _SUCCESS y orden correcto', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await repository.findPrimerosYUltimos('Lote', [1, 2, 3], 5);

      expect(mockTypeormRepo.createQueryBuilder).toHaveBeenCalledWith('log');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'log.entidad = :entidad',
        {
          entidad: 'Lote',
        },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'log.entidadId IN (:...entidadIds)',
        { entidadIds: [1, 2, 3] },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "log.accion LIKE '%\\_SUCCESS' ESCAPE '\\'",
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'log.entidadId',
        'ASC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'log.createdAt',
        'ASC',
      );
    });

    it('deberia agregar el filtro de empresaId cuando se pasa un valor no nulo', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await repository.findPrimerosYUltimos('Lote', [1], 5);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'log.empresaId = :empresaId',
        { empresaId: 5 },
      );
    });

    it('no deberia filtrar por empresaId cuando es null (acceso global tipo Administrador)', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await repository.findPrimerosYUltimos('Lote', [1], null);

      const empresaIdCalls = mockQueryBuilder.andWhere.mock.calls.filter(
        ([clause]) => clause === 'log.empresaId = :empresaId',
      );
      expect(empresaIdCalls).toHaveLength(0);
    });

    it('deberia devolver el resultado de getMany tal cual', async () => {
      const logs = [
        { id: 1, entidadId: 1 },
        { id: 2, entidadId: 1 },
      ] as unknown as AuditLog[];
      mockQueryBuilder.getMany.mockResolvedValue(logs);

      const result = await repository.findPrimerosYUltimos('Lote', [1], 5);

      expect(result).toEqual(logs);
    });
  });
});
