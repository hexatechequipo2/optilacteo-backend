import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';

import { DashboardController } from '../dashboard.controller';
import { DashboardService } from '../dashboard.service';

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
    it('cuando el usuario tiene una empresa asociada, debe devolver el dashboard', async () => {
      const tenant = {
        empresaId: 1,
      } as any;

      const dashboard = {
        lotesProcesados: {},
        alertasActivas: {},
        parametrosCriticos: {},
        lineaCalidad: {},
        actualizadoEn: new Date(),
      };

      dashboardServiceMock.getDashboard.mockResolvedValue(dashboard);

      const result = await controller.findAll(tenant);

      expect(dashboardServiceMock.getDashboard).toHaveBeenCalledWith(tenant);
      expect(result).toBe(dashboard);
    });

    it('cuando el usuario no tiene una empresa asociada, debe lanzar ForbiddenException', () => {
      const tenant = {
        empresaId: null,
      } as any;

      expect(() => controller.findAll(tenant)).toThrow(ForbiddenException);
      expect(() => controller.findAll(tenant)).toThrow(
        'El usuario no tiene una empresa asociada.',
      );
    });
  });

  describe('getHistorico', () => {
    it('cuando el usuario tiene una empresa asociada, debe devolver el histórico de lotes procesados', async () => {
      const tenant = {
        empresaId: 5,
      } as any;

      const historico = {
        dias: 7,
        puntos: [],
      };

      dashboardServiceMock.getHistoricoLotesProcesados.mockResolvedValue(
        historico,
      );

      const result = await controller.getHistorico(tenant, 7);

      expect(
        dashboardServiceMock.getHistoricoLotesProcesados,
      ).toHaveBeenCalledWith(tenant, 7);

      expect(result).toBe(historico);
    });

    it('cuando el usuario no tiene una empresa asociada, debe lanzar ForbiddenException', () => {
      const tenant = {
        empresaId: null,
      } as any;

      expect(() => controller.getHistorico(tenant, 7)).toThrow(
        ForbiddenException,
      );

      expect(() => controller.getHistorico(tenant, 7)).toThrow(
        'El usuario no tiene una empresa asociada.',
      );
    });
  });
});