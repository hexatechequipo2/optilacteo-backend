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
    skip: jest.Mock;
    take: jest.Mock;
    getMany: jest.Mock;
    getManyAndCount: jest.Mock;
  };

  beforeEach(() => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
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
        userNombre: 'anonymous',
        userRol: 'ANONIMO',
        empresaId: null,
        tipo: 'AUTH' as CreateAuditLogData['tipo'],
        accion: 'LOGIN_FAILURE',
        entidad: 'Usuario',
        entidadId: null,
        descripcion: 'Inicio de sesión fallido',
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
        userNombre: 'Usuario',
        userRol: 'GERENTE',
        empresaId: 2,
        tipo: 'PROVEEDOR' as CreateAuditLogData['tipo'],
        accion: 'PROVEEDOR_ELIMINAR_SUCCESS',
        entidad: 'Proveedor',
        entidadId: 10,
        descripcion: 'Proveedor eliminado correctamente',
        detalle: { antes: 'ACTIVA', despues: 'SUSPENDIDA' },
      };
      const created = { id: 2, ...data } as unknown as AuditLog;
      mockTypeormRepo.create.mockReturnValue(created);
      mockTypeormRepo.save.mockResolvedValue(created);

      await repository.create(data);

      expect(mockTypeormRepo.create).toHaveBeenCalledWith(data);
    });
  });

  describe('findFiltered', () => {
    it('para Administrador no aplica filtro de empresa', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      const tenant: TenantContext = {
        empresaId: null,
        rolNombre: ROLES.ADMINISTRADOR,
      };

      await repository.findFiltered(tenant, {}, 0, 50);

      expect(mockTypeormRepo.createQueryBuilder).toHaveBeenCalledWith('log');
      const empresaCalls = mockQueryBuilder.andWhere.mock.calls.filter(
        ([clause]) => clause.includes('log.empresaId ='),
      );
      expect(empresaCalls).toHaveLength(0);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
    });

    it('para un rol distinto de Administrador filtra por la empresa del tenant', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      const tenant: TenantContext = { empresaId: 3, rolNombre: ROLES.GERENTE };

      await repository.findFiltered(tenant, {}, 10, 25);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'log.empresaId = :empresaId',
        { empresaId: 3 },
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(25);
    });

    it('devuelve el resultado tal cual lo entrega getManyAndCount', async () => {
      const logs = [{ id: 1 }] as unknown as AuditLog[];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([logs, 1]);
      const tenant: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };

      const result = await repository.findFiltered(tenant, {}, 0, 50);

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
        { entidad: 'Lote' },
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