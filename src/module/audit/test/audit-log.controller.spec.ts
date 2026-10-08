import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';

import { AuditLogController } from '../audit-log.controller';
import { AuditLogService } from '../audit-log.service';
import { QueryAuditLogDto } from '../dto/query-audit-log.dto';
import { ModuloAdministrativo } from '../../permiso/enums/modulo-administrativo.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import { TIPO_ACCION_LABELS } from '../enums/tipo-accion.enum';
import type { TenantContext } from '../../../common/types/tenant-context.type';
import { ROLES } from '../../rol/constants/roles.constants';

describe('AuditLogController', () => {
  let controller: AuditLogController;
  let reflector: Reflector;

  let mockAuditLogService: {
    findAll: jest.Mock;
    exportarCsv: jest.Mock;
  };

  const mockTenant: TenantContext = {
    empresaId: 1,
    rolNombre: ROLES.GERENTE,
  };

  beforeEach(async () => {
    mockAuditLogService = {
      findAll: jest.fn(),
      exportarCsv: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    controller = module.get<AuditLogController>(AuditLogController);
    reflector = new Reflector();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /audit-log (findAll)', () => {
    it('debería delegar en el servicio pasando el tenant y el query DTO', async () => {
      const queryDto: QueryAuditLogDto = { page: 1, limit: 10 };
      const expectedResult = { data: [], meta: { page: 1, limit: 10, total: 0 } };

      mockAuditLogService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockTenant, queryDto);

      expect(mockAuditLogService.findAll).toHaveBeenCalledWith(
        mockTenant,
        queryDto,
      );
      expect(result).toEqual(expectedResult);
    });

    it('debería exponer los permisos AUDITORIA READ en la metadata', () => {
      const permissions = reflector.get(
        'permissions',
        controller.findAll,
      );

      expect(permissions).toEqual({
        modulo: ModuloAdministrativo.AUDITORIA,
        action: PermissionAction.READ,
      });
    });
  });

  describe('GET /audit-log/tipos (getTipos)', () => {
    it('debería retornar la lista mapeada de tipos de acción con value y label', () => {
      const result = controller.getTipos();

      const expectedTipos = Object.entries(TIPO_ACCION_LABELS).map(
        ([value, label]) => ({
          value,
          label,
        }),
      );

      expect(result).toEqual(expectedTipos);
    });

    it('debería exponer los permisos AUDITORIA READ en la metadata', () => {
      const permissions = reflector.get(
        'permissions',
        controller.getTipos,
      );

      expect(permissions).toEqual({
        modulo: ModuloAdministrativo.AUDITORIA,
        action: PermissionAction.READ,
      });
    });
  });

  describe('GET /audit-log/export (export)', () => {
    it('debería exportar el CSV, configurar el header Content-Disposition y retornarlo', async () => {
      const queryDto: QueryAuditLogDto = { page: 1, limit: 20 };
      const csvContent = 'id,usuario,accion\n1,admin,LOGIN';

      mockAuditLogService.exportarCsv.mockResolvedValue(csvContent);

      const mockResponse = {
        setHeader: jest.fn(),
      } as unknown as Response;

      const result = await controller.export(
        mockTenant,
        queryDto,
        mockResponse,
      );

      expect(mockAuditLogService.exportarCsv).toHaveBeenCalledWith(
        mockTenant,
        queryDto,
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^attachment; filename="audit-log-\d{4}-\d{2}-\d{2}\.csv"$/),
      );
      expect(result).toBe(csvContent);
    });

    it('debería exponer los permisos AUDITORIA EXPORT en la metadata', () => {
      const permissions = reflector.get(
        'permissions',
        controller.export,
      );

      expect(permissions).toEqual({
        modulo: ModuloAdministrativo.AUDITORIA,
        action: PermissionAction.EXPORT,
      });
    });
  });
});