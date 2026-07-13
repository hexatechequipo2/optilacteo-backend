import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogController } from '../audit-log.controller';
import { AuditLogService } from '../audit-log.service';
import { ROLES } from '../../rol/constants/roles.constants';
import type { TenantContext } from '../../../common/types/tenant-context.type';

const mockAuditLogService = {
  findAll: jest.fn(),
};

describe('AuditLogController', () => {
  let controller: AuditLogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [{ provide: AuditLogService, useValue: mockAuditLogService }],
    }).compile();

    controller = module.get<AuditLogController>(AuditLogController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('GET /audit-log', () => {
    it('deberia delegar en el servicio sin convertir page/limit cuando no vienen en la query', async () => {
      const tenant: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };
      mockAuditLogService.findAll.mockResolvedValue([[], 0]);

      await controller.findAll(tenant);

      expect(mockAuditLogService.findAll).toHaveBeenCalledWith(
        tenant,
        undefined,
        undefined,
      );
    });

    it('deberia convertir page y limit de string a number antes de delegar en el servicio', async () => {
      const tenant: TenantContext = { empresaId: null, rolNombre: ROLES.ADMINISTRADOR };
      mockAuditLogService.findAll.mockResolvedValue([[], 0]);

      await controller.findAll(tenant, '2', '25');

      expect(mockAuditLogService.findAll).toHaveBeenCalledWith(tenant, 2, 25);
    });

    it('deberia devolver el resultado tal cual lo entrega el servicio', async () => {
      const tenant: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };
      const logs = [{ id: 1 }] as never;
      mockAuditLogService.findAll.mockResolvedValue([logs, 1]);

      const result = await controller.findAll(tenant, '1', '50');

      expect(result).toEqual([logs, 1]);
    });
  });
});
