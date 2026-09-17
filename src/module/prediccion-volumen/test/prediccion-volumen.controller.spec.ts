import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { PrediccionVolumenController } from '../prediccion-volumen.controller';
import { PrediccionVolumenService } from '../prediccion-volumen.service';
import { PrediccionVolumenQueryDto } from '../dto/prediccion-volumen-query.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { TenantContext } from '../../../common/types/tenant-context.type';
import type { Response } from 'express';

describe('PrediccionVolumenController', () => {
  let controller: PrediccionVolumenController;
  let service: jest.Mocked<PrediccionVolumenService>;

  const mockTenant: TenantContext = {
    empresaId: 1,
    rolNombre: null,
  };

  const mockQuery: PrediccionVolumenQueryDto = {
    tipoMateriaPrima: 'LECHE_ENTERA',
  } as any;

  beforeEach(async () => {
    const serviceMock = {
      obtenerParaDashboard: jest.fn(),
      exportarCsv: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrediccionVolumenController],
      providers: [
        {
          provide: PrediccionVolumenService,
          useValue: serviceMock,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PrediccionVolumenController>(PrediccionVolumenController);
    service = module.get(PrediccionVolumenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('obtener', () => {
    it('debe retornar los datos del dashboard desde el servicio', async () => {
      const mockDashboardResult = {
        resumen: { totalEstimado: 1000 },
        puntos: [],
      };
      service.obtenerParaDashboard.mockResolvedValue(mockDashboardResult as any);

      const result = await controller.obtener(mockQuery, mockTenant);

      expect(result).toEqual(mockDashboardResult);
      expect(service.obtenerParaDashboard).toHaveBeenCalledWith(1, mockQuery);
    });
  });

  describe('exportarCsv', () => {
    it('debe configurar los headers de respuesta y enviar el buffer del CSV', async () => {
      const mockCsvContent = 'fecha,volumen\n2026-09-16,500';
      const mockBuffer = Buffer.from(mockCsvContent, 'utf-8');
      service.exportarCsv.mockResolvedValue(mockBuffer);

      const resMock = {
        setHeader: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      await controller.exportarCsv(mockQuery, mockTenant, resMock);

      expect(service.exportarCsv).toHaveBeenCalledWith(1, mockQuery);
      expect(resMock.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(resMock.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="prediccion-volumen-${mockQuery.tipoMateriaPrima}.csv"`,
      );
      expect(resMock.setHeader).toHaveBeenCalledWith('Content-Length', mockBuffer.length);
      expect(resMock.end).toHaveBeenCalledWith(mockBuffer);
    });
  });
});