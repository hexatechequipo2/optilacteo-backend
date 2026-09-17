import { Test, TestingModule } from '@nestjs/testing';
import { MlController } from '../ml.controller';
import { MlService } from '../ml.service';
import { ResponderRecomendacionDto } from '../dto/responder-recomendacion.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { TenantContext } from '../../../common/types/tenant-context.type';
import { ROLES } from '../../rol/constants/roles.constants';

describe('MlController — gestión de recomendaciones de IA (HU-49 / HU-37)', () => {
  let controller: MlController;
  let service: MlService;

  const mockMlService = {
    responderRecomendacion: jest.fn(),
    recomendacionPendientePorLote: jest.fn(),
    historialAciertos: jest.fn(),
    historialDivergencias: jest.fn(),
    obtenerTodas: jest.fn(),
  };

  const mockTenant: TenantContext = {
    empresaId: 1,
    rolNombre: ROLES.RESPONSABLE_PRODUCCION as any,
  };

  const mockReq = {
    user: {
      sub: 42,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MlController],
      providers: [
        {
          provide: MlService,
          useValue: mockMlService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MlController>(MlController);
    service = module.get<MlService>(MlService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('responder', () => {
    it('debe convertir id a number, extraer el usuarioId de la request y delegar la respuesta al servicio', async () => {
      const idString = '10';
      const idNumber = 10;
      const dto: ResponderRecomendacionDto = {
        aceptada: true,
        destinoFinalId: 2,
        justificacion: 'Aceptado según parámetro de humedad',
      } as any;

      const mockResponse = { success: true };
      mockMlService.responderRecomendacion.mockResolvedValue(mockResponse);

      const resultado = await controller.responder(
        idString,
        dto,
        mockTenant,
        mockReq,
      );

      expect(service.responderRecomendacion).toHaveBeenCalledWith(
        idNumber,
        dto,
        mockTenant,
        42,
      );
      expect(resultado).toEqual(mockResponse);
    });
  });

  describe('recomendacionPendientePorLote', () => {
    it('debe convertir loteId a number y delegar la búsqueda de recomendación pendiente al servicio', async () => {
      const loteIdString = '100';
      const loteIdNumber = 100;
      const mockRecomendacion = {
        id: 10,
        loteId: 100,
        destinoRecomendado: 'Queso Cremoso',
      };

      mockMlService.recomendacionPendientePorLote.mockResolvedValue(
        mockRecomendacion,
      );

      const resultado = await controller.recomendacionPendientePorLote(
        loteIdString,
        mockTenant,
      );

      expect(service.recomendacionPendientePorLote).toHaveBeenCalledWith(
        loteIdNumber,
        mockTenant,
      );
      expect(resultado).toEqual(mockRecomendacion);
    });
  });

  describe('historial', () => {
    it('debe delegar la consulta del historial de aciertos al servicio', async () => {
      const mockHistorial = [
        { mes: '2026-01', tasaAcierto: 0.95 },
      ];
      mockMlService.historialAciertos.mockResolvedValue(mockHistorial);

      const resultado = await controller.historial(mockTenant);

      expect(service.historialAciertos).toHaveBeenCalledWith(mockTenant);
      expect(resultado).toEqual(mockHistorial);
    });
  });

  describe('historialDivergencias', () => {
    it('debe delegar la consulta del reporte de divergencias al servicio', async () => {
      const mockDivergencias = [
        {
          loteId: 5,
          destinoRecomendado: 'Queso Cremoso',
          destinoElegido: 'Manteca',
          justificacion: 'Falta de stock de leche entera',
        },
      ];
      mockMlService.historialDivergencias.mockResolvedValue(mockDivergencias);

      const resultado = await controller.historialDivergencias(mockTenant);

      expect(service.historialDivergencias).toHaveBeenCalledWith(mockTenant);
      expect(resultado).toEqual(mockDivergencias);
    });
  });

  describe('obtenerTodas', () => {
    it('debe delegar la consulta de todas las recomendaciones al servicio', async () => {
      const mockTodas = [
        { id: 1, loteId: 10 },
        { id: 2, loteId: 11 },
      ];
      mockMlService.obtenerTodas.mockResolvedValue(mockTodas);

      const resultado = await controller.obtenerTodas(mockTenant);

      expect(service.obtenerTodas).toHaveBeenCalledWith(mockTenant);
      expect(resultado).toEqual(mockTodas);
    });
  });
});