import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { AuditLogController } from '../audit-log.controller';
import { AuditLogService } from '../audit-log.service';
import { ROLES } from '../../rol/constants/roles.constants';
import type { TenantContext } from '../../../common/types/tenant-context.type';

const mockAuditLogService = {
  findAll: jest.fn(),
};

describe('AuditLogController', () => {
  let controller: AuditLogController;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [{ provide: AuditLogService, useValue: mockAuditLogService }],
    }).compile();

    controller = module.get<AuditLogController>(AuditLogController);
    reflector = new Reflector();
  });

  afterEach(() => jest.clearAllMocks());

  it('deberia estar definido', () => {
    expect(controller).toBeDefined();
  });

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
      const tenant: TenantContext = {
        empresaId: null,
        rolNombre: ROLES.ADMINISTRADOR,
      };
      mockAuditLogService.findAll.mockResolvedValue([[], 0]);

      await controller.findAll(tenant, '2', '25');

      expect(mockAuditLogService.findAll).toHaveBeenCalledWith(tenant, 2, 25);
    });

    it('deberia convertir solo page cuando limit no viene en la query', async () => {
      const tenant: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };
      mockAuditLogService.findAll.mockResolvedValue([[], 0]);

      await controller.findAll(tenant, '3');

      expect(mockAuditLogService.findAll).toHaveBeenCalledWith(
        tenant,
        3,
        undefined,
      );
    });

    it('deberia convertir solo limit cuando page no viene en la query', async () => {
      const tenant: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };
      mockAuditLogService.findAll.mockResolvedValue([[], 0]);

      await controller.findAll(tenant, undefined, '10');

      expect(mockAuditLogService.findAll).toHaveBeenCalledWith(
        tenant,
        undefined,
        10,
      );
    });

    it('deberia pasar NaN al servicio si page/limit no son numericos (no valida en el controller)', async () => {
      const tenant: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };
      mockAuditLogService.findAll.mockResolvedValue([[], 0]);

      await controller.findAll(tenant, 'abc', 'xyz');

      const [, pageArg, limitArg] = mockAuditLogService.findAll.mock.calls[0];
      expect(Number.isNaN(pageArg)).toBe(true);
      expect(Number.isNaN(limitArg)).toBe(true);
    });

    it('deberia devolver el resultado tal cual lo entrega el servicio', async () => {
      const tenant: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };
      const logs = [{ id: 1 }] as never;
      mockAuditLogService.findAll.mockResolvedValue([logs, 1]);

      const result = await controller.findAll(tenant, '1', '50');

      expect(result).toEqual([logs, 1]);
    });

    it('deberia propagar el error si el servicio rechaza la promesa', async () => {
      const tenant: TenantContext = { empresaId: 1, rolNombre: ROLES.GERENTE };
      mockAuditLogService.findAll.mockRejectedValue(new Error('DB error'));

      await expect(controller.findAll(tenant)).rejects.toThrow('DB error');
    });
  });

  describe('Roles metadata', () => {
    it('deberia exponer los roles ADMINISTRADOR y GERENTE en findAll', () => {
      const roles = reflector.get<string[]>('roles', controller.findAll);
      expect(roles).toEqual(
        expect.arrayContaining([ROLES.ADMINISTRADOR, ROLES.GERENTE]),
      );
      expect(roles).toHaveLength(2);
    });
  });
});
