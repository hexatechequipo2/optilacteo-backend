import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { DashboardController } from '../dashboard.controller';
import { DashboardService } from '../dashboard.service';
import { GranularidadHistorico } from '../dto/dashboard-historico.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ROLES } from '../../rol/constants/roles.constants';
import { PERMISOS_POR_ROL } from '../../rol/config/roles-permisos.config';
import { ModuloSistema } from '../../empresa/enums/modulo-sistema.enum';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

describe('DashboardController', () => {
  let controller: DashboardController;

  const dashboardServiceMock = {
    getDashboard: jest.fn(),
    getHistoricoLotesProcesados: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: dashboardServiceMock,
        },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('cuando el usuario tiene una empresa asociada, debe devolver el dashboard con granularidad "dia"', async () => {
      const tenant = {
        empresaId: 1,
      } as any;

      const dashboard = {
        granularidad: GranularidadHistorico.DIA,
        lotesProcesados: {},
        alertasActivas: {},
        parametrosCriticos: {},
        lineaCalidad: {},
        actualizadoEn: new Date(),
      };

      dashboardServiceMock.getDashboard.mockResolvedValue(dashboard);

      const result = await controller.findAll(
        tenant,
        GranularidadHistorico.DIA,
      );

      expect(dashboardServiceMock.getDashboard).toHaveBeenCalledWith(
        tenant,
        GranularidadHistorico.DIA,
      );
      expect(result).toBe(dashboard);
    });

    it('cuando se pide granularidad "semana", debe pasarla tal cual al service', async () => {
      const tenant = { empresaId: 1 } as any;
      const dashboard = { granularidad: GranularidadHistorico.SEMANA } as any;

      dashboardServiceMock.getDashboard.mockResolvedValue(dashboard);

      const result = await controller.findAll(
        tenant,
        GranularidadHistorico.SEMANA,
      );

      expect(dashboardServiceMock.getDashboard).toHaveBeenCalledWith(
        tenant,
        GranularidadHistorico.SEMANA,
      );
      expect(result).toBe(dashboard);
    });

    it('cuando se pide granularidad "mes", debe pasarla tal cual al service', async () => {
      const tenant = { empresaId: 1 } as any;
      const dashboard = { granularidad: GranularidadHistorico.MES } as any;

      dashboardServiceMock.getDashboard.mockResolvedValue(dashboard);

      const result = await controller.findAll(
        tenant,
        GranularidadHistorico.MES,
      );

      expect(dashboardServiceMock.getDashboard).toHaveBeenCalledWith(
        tenant,
        GranularidadHistorico.MES,
      );
      expect(result).toBe(dashboard);
    });

    it('cuando el usuario no tiene una empresa asociada, debe lanzar ForbiddenException sin llamar al service', () => {
      const tenant = {
        empresaId: null,
      } as any;

      expect(() =>
        controller.findAll(tenant, GranularidadHistorico.DIA),
      ).toThrow(ForbiddenException);
      expect(() =>
        controller.findAll(tenant, GranularidadHistorico.DIA),
      ).toThrow('El usuario no tiene una empresa asociada.');
      expect(dashboardServiceMock.getDashboard).not.toHaveBeenCalled();
    });
  });

  describe('getHistorico', () => {
    it('cuando el usuario tiene una empresa asociada, debe devolver el histórico con granularidad "dia"', async () => {
      const tenant = {
        empresaId: 5,
      } as any;

      const historico = {
        granularidad: GranularidadHistorico.DIA,
        cantidad: 7,
        puntos: [],
      };

      dashboardServiceMock.getHistoricoLotesProcesados.mockResolvedValue(
        historico,
      );

      const result = await controller.getHistorico(
        tenant,
        GranularidadHistorico.DIA,
        7,
      );

      expect(
        dashboardServiceMock.getHistoricoLotesProcesados,
      ).toHaveBeenCalledWith(tenant, GranularidadHistorico.DIA, 7);
      expect(result).toBe(historico);
    });

    it('debe pasar granularidad "semana" y cantidad al service', async () => {
      const tenant = { empresaId: 5 } as any;
      const historico = {
        granularidad: GranularidadHistorico.SEMANA,
        cantidad: 12,
        puntos: [],
      };

      dashboardServiceMock.getHistoricoLotesProcesados.mockResolvedValue(
        historico,
      );

      const result = await controller.getHistorico(
        tenant,
        GranularidadHistorico.SEMANA,
        12,
      );

      expect(
        dashboardServiceMock.getHistoricoLotesProcesados,
      ).toHaveBeenCalledWith(tenant, GranularidadHistorico.SEMANA, 12);
      expect(result).toBe(historico);
    });

    it('debe pasar granularidad "mes" y cantidad al service', async () => {
      const tenant = { empresaId: 5 } as any;
      const historico = {
        granularidad: GranularidadHistorico.MES,
        cantidad: 6,
        puntos: [],
      };

      dashboardServiceMock.getHistoricoLotesProcesados.mockResolvedValue(
        historico,
      );

      const result = await controller.getHistorico(
        tenant,
        GranularidadHistorico.MES,
        6,
      );

      expect(
        dashboardServiceMock.getHistoricoLotesProcesados,
      ).toHaveBeenCalledWith(tenant, GranularidadHistorico.MES, 6);
      expect(result).toBe(historico);
    });

    it('cuando el usuario no tiene una empresa asociada, debe lanzar ForbiddenException sin llamar al service', () => {
      const tenant = {
        empresaId: null,
      } as any;

      expect(() =>
        controller.getHistorico(tenant, GranularidadHistorico.DIA, 7),
      ).toThrow(ForbiddenException);
      expect(() =>
        controller.getHistorico(tenant, GranularidadHistorico.DIA, 7),
      ).toThrow('El usuario no tiene una empresa asociada.');
      expect(
        dashboardServiceMock.getHistoricoLotesProcesados,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getSemaforoLote — acceso por rol (HU-40)', () => {
    const reflector = new Reflector();
    const rolesGuard = new RolesGuard(reflector);
    const permissionsGuard = new PermissionsGuard(reflector);

    function buildContext(user: { rolNombre: string; permisos: unknown[] }) {
      return {
        getHandler: () => DashboardController.prototype.getSemaforoLote,
        getClass: () => DashboardController,
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
      } as unknown as ExecutionContext;
    }

    it('Operario de línea no tiene DASHBOARD en su config de roles', () => {
      const modulos = PERMISOS_POR_ROL[ROLES.OPERARIO_LINEA].map(
        (p) => p.modulo,
      );
      expect(modulos).not.toContain(ModuloSistema.DASHBOARD);
    });

    it('permite el acceso a Operario de línea vía MONITOREO_ALERTAS', () => {
      const context = buildContext({
        rolNombre: ROLES.OPERARIO_LINEA,
        permisos: PERMISOS_POR_ROL[ROLES.OPERARIO_LINEA],
      });

      expect(rolesGuard.canActivate(context)).toBe(true);
      expect(permissionsGuard.canActivate(context)).toBe(true);
    });

    it('rechaza a un rol permitido que no tiene DASHBOARD ni MONITOREO_ALERTAS', () => {
      const context = buildContext({
        rolNombre: ROLES.OPERARIO_LINEA,
        permisos: [
          { modulo: ModuloSistema.RECEPCION, canRead: true, canWrite: false },
        ],
      });

      expect(() => permissionsGuard.canActivate(context)).toThrow(
        ForbiddenException,
      );
    });
  });
});
