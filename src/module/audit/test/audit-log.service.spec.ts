import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from '../audit-log.service';
import { AUDIT_LOG_REPOSITORY } from '../repository/audit-log-interface.repository';
import { ROLES } from '../../rol/constants/roles.constants';
import type { TenantContext } from '../../../common/types/tenant-context.type';
import type { AuditLog } from '../entity/audit-log.entity';

const mockAuditLogRepository = {
  create: jest.fn(),
  findAllScoped: jest.fn(),
  findPrimerosYUltimos: jest.fn(),
};

describe('AuditLogService', () => {
  let service: AuditLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: AUDIT_LOG_REPOSITORY, useValue: mockAuditLogRepository },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('record', () => {
    it('deberia delegar la creacion en el repositorio', async () => {
      mockAuditLogRepository.create.mockResolvedValue({ id: 1 });

      await service.record({
        userId: 1,
        userEmail: 'user@lacteo.com',
        empresaId: 1,
        accion: 'USUARIO_CREAR_SUCCESS',
        entidad: 'Usuario',
        entidadId: 10,
      });

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        userId: 1,
        userEmail: 'user@lacteo.com',
        empresaId: 1,
        accion: 'USUARIO_CREAR_SUCCESS',
        entidad: 'Usuario',
        entidadId: 10,
      });
    });

    it('no deberia propagar el error si el repositorio falla (best effort)', async () => {
      mockAuditLogRepository.create.mockRejectedValue(new Error('DB caida'));

      await expect(
        service.record({
          userId: null,
          userEmail: 'anonymous',
          empresaId: null,
          accion: 'LOGIN_FAILURE',
          entidad: 'Usuario',
          entidadId: null,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('deberia usar los valores por defecto de pagina y limite cuando no se especifican', async () => {
      mockAuditLogRepository.findAllScoped.mockResolvedValue([[], 0]);
      const tenant: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };

      await service.findAll(tenant);

      expect(mockAuditLogRepository.findAllScoped).toHaveBeenCalledWith(
        tenant,
        0,
        50,
      );
    });

    it('deberia calcular el skip en base a la pagina y el limite recibidos', async () => {
      mockAuditLogRepository.findAllScoped.mockResolvedValue([[], 0]);
      const tenant: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };

      await service.findAll(tenant, 3, 10);

      expect(mockAuditLogRepository.findAllScoped).toHaveBeenCalledWith(
        tenant,
        20,
        10,
      );
    });

    it('deberia forzar la pagina minima a 1 cuando se recibe un valor menor o igual a 0', async () => {
      mockAuditLogRepository.findAllScoped.mockResolvedValue([[], 0]);
      const tenant: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };

      await service.findAll(tenant, -5, 10);

      expect(mockAuditLogRepository.findAllScoped).toHaveBeenCalledWith(
        tenant,
        0,
        10,
      );
    });

    it('deberia limitar el tamano de pagina a 200 como maximo', async () => {
      mockAuditLogRepository.findAllScoped.mockResolvedValue([[], 0]);
      const tenant: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };

      await service.findAll(tenant, 1, 500);

      expect(mockAuditLogRepository.findAllScoped).toHaveBeenCalledWith(
        tenant,
        0,
        200,
      );
    });

    it('deberia forzar el limite minimo a 1 cuando se recibe un valor menor o igual a 0', async () => {
      mockAuditLogRepository.findAllScoped.mockResolvedValue([[], 0]);
      const tenant: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };

      await service.findAll(tenant, 1, -10);

      expect(mockAuditLogRepository.findAllScoped).toHaveBeenCalledWith(
        tenant,
        0,
        1,
      );
    });

    it('deberia devolver el resultado tal cual lo entrega el repositorio', async () => {
      const logs = [{ id: 1 }] as never;
      mockAuditLogRepository.findAllScoped.mockResolvedValue([logs, 1]);
      const tenant: TenantContext = { empresaId: null, rolNombre: ROLES.ADMINISTRADOR };

      const result = await service.findAll(tenant, 1, 50);

      expect(result).toEqual([logs, 1]);
    });
  });

  describe('getTrazabilidadBatch', () => {
    it('deberia devolver un Map vacio sin consultar el repositorio si entidadIds esta vacio', async () => {
      const result = await service.getTrazabilidadBatch('Lote', [], 1);

      expect(result).toEqual(new Map());
      expect(mockAuditLogRepository.findPrimerosYUltimos).not.toHaveBeenCalled();
    });

    it('deberia delegar en el repositorio con entidad, entidadIds y empresaId', async () => {
      mockAuditLogRepository.findPrimerosYUltimos.mockResolvedValue([]);

      await service.getTrazabilidadBatch('Lote', [1, 2], 5);

      expect(mockAuditLogRepository.findPrimerosYUltimos).toHaveBeenCalledWith(
        'Lote',
        [1, 2],
        5,
      );
    });

    it('cuando una entidad tiene un solo log, deberia devolver solo creadoPor sin ultimaModificacion', async () => {
      const log = {
        id: 100,
        entidadId: 1,
        userId: 7,
        userEmail: 'user@lacteo.com',
        createdAt: new Date('2026-01-01T10:00:00Z'),
      } as unknown as AuditLog;
      mockAuditLogRepository.findPrimerosYUltimos.mockResolvedValue([log]);

      const result = await service.getTrazabilidadBatch('Lote', [1], 5);

      expect(result.get(1)).toEqual({
        creadoPor: { userId: 7, userEmail: 'user@lacteo.com', fecha: log.createdAt },
        ultimaModificacion: undefined,
      });
    });

    it('cuando una entidad tiene varios logs, deberia tomar el primero como creadoPor y el ultimo como ultimaModificacion', async () => {
      const primero = {
        id: 100,
        entidadId: 1,
        userId: 7,
        userEmail: 'creador@lacteo.com',
        createdAt: new Date('2026-01-01T10:00:00Z'),
      } as unknown as AuditLog;
      const ultimo = {
        id: 105,
        entidadId: 1,
        userId: 9,
        userEmail: 'modificador@lacteo.com',
        createdAt: new Date('2026-02-01T10:00:00Z'),
      } as unknown as AuditLog;
      mockAuditLogRepository.findPrimerosYUltimos.mockResolvedValue([primero, ultimo]);

      const result = await service.getTrazabilidadBatch('Lote', [1], 5);

      expect(result.get(1)).toEqual({
        creadoPor: { userId: 7, userEmail: 'creador@lacteo.com', fecha: primero.createdAt },
        ultimaModificacion: {
          userId: 9,
          userEmail: 'modificador@lacteo.com',
          fecha: ultimo.createdAt,
        },
      });
    });

    it('deberia ignorar los logs con entidadId null', async () => {
      const logConEntidad = {
        id: 1,
        entidadId: 1,
        userId: 7,
        userEmail: 'user@lacteo.com',
        createdAt: new Date('2026-01-01T10:00:00Z'),
      } as unknown as AuditLog;
      const logSinEntidad = {
        id: 2,
        entidadId: null,
        userId: 8,
        userEmail: 'otro@lacteo.com',
        createdAt: new Date('2026-01-02T10:00:00Z'),
      } as unknown as AuditLog;
      mockAuditLogRepository.findPrimerosYUltimos.mockResolvedValue([
        logConEntidad,
        logSinEntidad,
      ]);

      const result = await service.getTrazabilidadBatch('Lote', [1], 5);

      expect(result.size).toBe(1);
      expect(result.has(1)).toBe(true);
    });

    it('deberia agrupar correctamente los logs cuando hay multiples entidades', async () => {
      const logsEntidad1 = [
        {
          id: 1,
          entidadId: 1,
          userId: 7,
          userEmail: 'a@lacteo.com',
          createdAt: new Date('2026-01-01T10:00:00Z'),
        },
        {
          id: 2,
          entidadId: 1,
          userId: 8,
          userEmail: 'b@lacteo.com',
          createdAt: new Date('2026-01-02T10:00:00Z'),
        },
      ];
      const logEntidad2 = {
        id: 3,
        entidadId: 2,
        userId: 9,
        userEmail: 'c@lacteo.com',
        createdAt: new Date('2026-01-03T10:00:00Z'),
      };
      mockAuditLogRepository.findPrimerosYUltimos.mockResolvedValue([
        ...logsEntidad1,
        logEntidad2,
      ] as unknown as AuditLog[]);

      const result = await service.getTrazabilidadBatch('Lote', [1, 2], 5);

      expect(result.size).toBe(2);
      expect(result.get(1)?.creadoPor?.userEmail).toBe('a@lacteo.com');
      expect(result.get(1)?.ultimaModificacion?.userEmail).toBe('b@lacteo.com');
      expect(result.get(2)?.creadoPor?.userEmail).toBe('c@lacteo.com');
      expect(result.get(2)?.ultimaModificacion).toBeUndefined();
    });
  });

  describe('getTrazabilidad', () => {
    it('deberia delegar en getTrazabilidadBatch con un array de un solo elemento', async () => {
      mockAuditLogRepository.findPrimerosYUltimos.mockResolvedValue([]);

      await service.getTrazabilidad('Lote', 1, 5);

      expect(mockAuditLogRepository.findPrimerosYUltimos).toHaveBeenCalledWith(
        'Lote',
        [1],
        5,
      );
    });

    it('deberia devolver el objeto de trazabilidad de la entidad solicitada', async () => {
      const log = {
        id: 1,
        entidadId: 1,
        userId: 7,
        userEmail: 'user@lacteo.com',
        createdAt: new Date('2026-01-01T10:00:00Z'),
      } as unknown as AuditLog;
      mockAuditLogRepository.findPrimerosYUltimos.mockResolvedValue([log]);

      const result = await service.getTrazabilidad('Lote', 1, 5);

      expect(result).toEqual({
        creadoPor: { userId: 7, userEmail: 'user@lacteo.com', fecha: log.createdAt },
        ultimaModificacion: undefined,
      });
    });

    it('deberia devolver un objeto vacio cuando no hay logs para esa entidad', async () => {
      mockAuditLogRepository.findPrimerosYUltimos.mockResolvedValue([]);

      const result = await service.getTrazabilidad('Lote', 999, 5);

      expect(result).toEqual({});
    });
  });
});