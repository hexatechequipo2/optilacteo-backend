import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';

import { DashboardController } from '../dashboard.controller';
import { DashboardService } from '../dashboard.service';
import { GranularidadHistorico } from '../dto/dashboard-historico.dto';

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

      const result = await controller.findAll(tenant, GranularidadHistorico.DIA);

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

      const result = await controller.findAll(tenant, GranularidadHistorico.SEMANA);

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

      const result = await controller.findAll(tenant, GranularidadHistorico.MES);

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

      expect(() => controller.findAll(tenant, GranularidadHistorico.DIA)).toThrow(
        ForbiddenException,
      );
      expect(() => controller.findAll(tenant, GranularidadHistorico.DIA)).toThrow(
        'El usuario no tiene una empresa asociada.',
      );
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

      dashboardServiceMock.getHistoricoLotesProcesados.mockResolvedValue(historico);

      const result = await controller.getHistorico(
        tenant,
        GranularidadHistorico.DIA,
        7,
      );

      expect(dashboardServiceMock.getHistoricoLotesProcesados).toHaveBeenCalledWith(
        tenant,
        GranularidadHistorico.DIA,
        7,
      );
      expect(result).toBe(historico);
    });

    it('debe pasar granularidad "semana" y cantidad al service', async () => {
      const tenant = { empresaId: 5 } as any;
      const historico = {
        granularidad: GranularidadHistorico.SEMANA,
        cantidad: 12,
        puntos: [],
      };

      dashboardServiceMock.getHistoricoLotesProcesados.mockResolvedValue(historico);

      const result = await controller.getHistorico(
        tenant,
        GranularidadHistorico.SEMANA,
        12,
      );

      expect(dashboardServiceMock.getHistoricoLotesProcesados).toHaveBeenCalledWith(
        tenant,
        GranularidadHistorico.SEMANA,
        12,
      );
      expect(result).toBe(historico);
    });

    it('debe pasar granularidad "mes" y cantidad al service', async () => {
      const tenant = { empresaId: 5 } as any;
      const historico = {
        granularidad: GranularidadHistorico.MES,
        cantidad: 6,
        puntos: [],
      };

      dashboardServiceMock.getHistoricoLotesProcesados.mockResolvedValue(historico);

      const result = await controller.getHistorico(
        tenant,
        GranularidadHistorico.MES,
        6,
      );

      expect(dashboardServiceMock.getHistoricoLotesProcesados).toHaveBeenCalledWith(
        tenant,
        GranularidadHistorico.MES,
        6,
      );
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
});