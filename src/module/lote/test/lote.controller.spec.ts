import { Test, TestingModule } from '@nestjs/testing';

import { LoteController } from '../lote.controller';
import { LoteService } from '../lote.service';
import { LoteConsumoService } from '../lote-consumo.service';
import { LoteTrazabilidadService } from '../lote-trazabilidad.service';
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

describe('LoteController', () => {
  let controller: LoteController;

  const loteServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findNoAptos: jest.fn(),
    findOne: jest.fn(),
    getMetricasCalidad: jest.fn(),
    update: jest.fn(),
    finalizar: jest.fn(),
    getHistorialClasificaciones: jest.fn(),
    revisarLote: jest.fn(),
    getHistorialRevisiones: jest.fn(),
    compararConHistorico: jest.fn(),
  };

  const loteConsumoServiceMock = {
    findLotesProduccion: jest.fn(),
    registrarConsumo: jest.fn(),
    historial: jest.fn(),
  };

  const loteTrazabilidadServiceMock = {
    getTrazabilidad: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoteController],
      providers: [
        {
          provide: LoteService,
          useValue: loteServiceMock,
        },
        {
          provide: LoteConsumoService,
          useValue: loteConsumoServiceMock,
        },
        {
          provide: LoteTrazabilidadService,
          useValue: loteTrazabilidadServiceMock,
        },
      ],
    }).compile();

    controller = module.get<LoteController>(LoteController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('debe registrar un lote', async () => {
      const dto = { codigo: 'L001' } as any;
      const tenant = { empresaId: 1 } as any;
      const lote = { id: 1 };

      loteServiceMock.create.mockResolvedValue(lote);

      const result = await controller.create(dto, tenant);

      expect(loteServiceMock.create).toHaveBeenCalledWith(dto, tenant);
      expect(result).toBe(lote);
    });
  });

  describe('findAll', () => {
    it('debe devolver el listado de lotes', async () => {
      const query = { page: 1 } as any;
      const tenant = { empresaId: 1 } as any;
      const response = { data: [], total: 0 };

      loteServiceMock.findAll.mockResolvedValue(response);

      const result = await controller.findAll(query, tenant);

      expect(loteServiceMock.findAll).toHaveBeenCalledWith(query, tenant);
      expect(result).toBe(response);
    });
  });

  describe('findNoAptos', () => {
    it('debe devolver los lotes no aptos', async () => {
      const tenant = { empresaId: 1 } as any;
      const response = [{ id: 1 }];

      loteServiceMock.findNoAptos.mockResolvedValue(response);

      const result = await controller.findNoAptos(tenant);

      expect(loteServiceMock.findNoAptos).toHaveBeenCalledWith(tenant);
      expect(result).toBe(response);
    });
  });

  describe('findOne', () => {
    it('debe devolver un lote por id', async () => {
      const tenant = { empresaId: 1 } as any;
      const lote = { id: 5 };

      loteServiceMock.findOne.mockResolvedValue(lote);

      const result = await controller.findOne('5', tenant);

      expect(loteServiceMock.findOne).toHaveBeenCalledWith(5, tenant);
      expect(result).toBe(lote);
    });
  });

  describe('getMetricasCalidad', () => {
    it('debe devolver las métricas de calidad del lote', async () => {
      const tenant = { empresaId: 1 } as any;
      const metricas = { ph: 6.8 };

      loteServiceMock.getMetricasCalidad.mockResolvedValue(metricas);

      const result = await controller.getMetricasCalidad('7', tenant);

      expect(loteServiceMock.getMetricasCalidad).toHaveBeenCalledWith(
        7,
        tenant,
      );
      expect(result).toBe(metricas);
    });
  });

  describe('update', () => {
    it('debe actualizar un lote', async () => {
      const dto = { proveedor: 'Nuevo proveedor' } as any;
      const tenant = { empresaId: 1 } as any;
      const lote = { id: 3 };

      loteServiceMock.update.mockResolvedValue(lote);

      const result = await controller.update('3', dto, tenant);

      expect(loteServiceMock.update).toHaveBeenCalledWith(3, dto, tenant);
      expect(result).toBe(lote);
    });
  });

  describe('finalizar', () => {
    it('debe finalizar un lote', async () => {
      const dto = {
        // Agregar acá los campos requeridos por FinalizarLoteDto
      } as any;

      const tenant = { empresaId: 1 } as any;
      const response = { ok: true };

      loteServiceMock.finalizar.mockResolvedValue(response);

      const result = await controller.finalizar('8', dto, tenant);

      expect(loteServiceMock.finalizar).toHaveBeenCalledWith(8, dto, tenant);
      expect(result).toBe(response);
    });
  });

  describe('getHistorialClasificaciones', () => {
    it('debe devolver el historial de clasificaciones', async () => {
      const tenant = { empresaId: 1 } as any;
      const historial = [{ id: 1 }];

      loteServiceMock.getHistorialClasificaciones.mockResolvedValue(historial);

      const result = await controller.getHistorialClasificaciones('10', tenant);

      expect(loteServiceMock.getHistorialClasificaciones).toHaveBeenCalledWith(
        10,
        tenant,
      );

      expect(result).toBe(historial);
    });
  });

  describe('revisar', () => {
    it('debe revisar un lote', async () => {
      const dto = { aprobado: true } as any;
      const tenant = { empresaId: 1 } as any;
      const req = {
        user: {
          sub: 25,
        },
      };

      const response = { revisado: true };

      loteServiceMock.revisarLote.mockResolvedValue(response);

      const result = await controller.revisar('12', dto, tenant, req);

      expect(loteServiceMock.revisarLote).toHaveBeenCalledWith(
        12,
        dto,
        tenant,
        25,
      );

      expect(result).toBe(response);
    });
  });

  describe('getHistorialRevisiones', () => {
    it('debe devolver el historial de revisiones', async () => {
      const tenant = { empresaId: 1 } as any;
      const historial = [{ id: 1 }];

      loteServiceMock.getHistorialRevisiones.mockResolvedValue(historial);

      const result = await controller.getHistorialRevisiones('20', tenant);

      expect(loteServiceMock.getHistorialRevisiones).toHaveBeenCalledWith(
        20,
        tenant,
      );

      expect(result).toBe(historial);
    });
  });

  describe('compararConHistorico', () => {
    it('debe devolver la comparación histórica del lote', async () => {
      const tenant = { empresaId: 1 } as any;
      const comparacion = {
        promedio: 8,
        lote: 7,
      };

      loteServiceMock.compararConHistorico.mockResolvedValue(comparacion);

      const result = await controller.compararConHistorico('15', tenant);

      expect(loteServiceMock.compararConHistorico).toHaveBeenCalledWith(
        15,
        tenant,
      );

      expect(result).toBe(comparacion);
    });
  });
});