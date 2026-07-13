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
  };

  beforeEach(() => {
    mockTypeormRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
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
      const tenant: TenantContext = { empresaId: null, rolNombre: ROLES.ADMINISTRADOR };

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
});
