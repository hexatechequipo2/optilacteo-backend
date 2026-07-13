import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from '../audit-log.service';
import { AUDIT_LOG_REPOSITORY } from '../repository/audit-log-interface.repository';
import { ROLES } from '../../rol/constants/roles.constants';
import type { TenantContext } from '../../../common/types/tenant-context.type';

const mockAuditLogRepository = {
  create: jest.fn(),
  findAllScoped: jest.fn(),
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
      });

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        userId: 1,
        userEmail: 'user@lacteo.com',
        empresaId: 1,
        accion: 'USUARIO_CREAR_SUCCESS',
        entidad: 'Usuario',
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
});
