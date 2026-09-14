import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';

import { MlService } from '../ml.service';
import { ML_CLIENT } from '../interfaces/ml-client.interface';
import { RecomendacionDestino } from '../entities/recomendacion-destino.entity';
import { DestinoProductivo } from '../../destino-productivo/entities/destino-productivo.entity';
import { Lote } from '../../lote/entities/lote.entity';
import { LoteDestinoHistorial } from '../../lote/entities/lote-destino-historial.entity';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import type { TenantContext } from '../../../common/types/tenant-context.type';

const mockMlClient = {
  predecirDestino: jest.fn(),
};

const mockRecomendacionRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
};

const mockDestinoProductivoRepo = {
  findOne: jest.fn(),
};

const mockLoteRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
};

const mockLoteDestinoHistorialRepo = {
  create: jest.fn(),
  save: jest.fn(),
};

describe('MlService', () => {
  let service: MlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MlService,
        { provide: ML_CLIENT, useValue: mockMlClient },
        {
          provide: getRepositoryToken(RecomendacionDestino),
          useValue: mockRecomendacionRepo,
        },
        {
          provide: getRepositoryToken(DestinoProductivo),
          useValue: mockDestinoProductivoRepo,
        },
        { provide: getRepositoryToken(Lote), useValue: mockLoteRepo },
        {
          provide: getRepositoryToken(LoteDestinoHistorial),
          useValue: mockLoteDestinoHistorialRepo,
        },
      ],
    }).compile();

    service = module.get<MlService>(MlService);
  });

  afterEach(() => jest.clearAllMocks());

  const tenant = { empresaId: 1, rolNombre: null } as TenantContext;
  const justificacionValida = 'x'.repeat(25);

  describe('generarRecomendacion', () => {
    it('debe lanzar UnprocessableEntityException si la lista de parámetros está vacía o es nula', async () => {
      await expect(
        service.generarRecomendacion({
          empresaId: 1,
          loteId: 10,
          parametros: [],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('debe retornar null si el cliente ML devuelve status insufficient_data', async () => {
      mockMlClient.predecirDestino.mockResolvedValue({
        status: 'insufficient_data',
      });

      const result = await service.generarRecomendacion({
        empresaId: 1,
        loteId: 10,
        parametros: [{ parametro: Parametro.GRASA, valor: 3.8 }],
      });

      expect(result).toBeNull();
      expect(mockMlClient.predecirDestino).toHaveBeenCalledWith({
        empresaId: 1,
        parametros: { [Parametro.GRASA]: 3.8 },
      });
    });

    it('debe retornar null si el destino recomendado por el ML no existe en el catálogo de la empresa', async () => {
      mockMlClient.predecirDestino.mockResolvedValue({
        status: 'success',
        destinoRecomendado: 'Queso Inexistente',
        confianza: 0.9,
      });
      mockDestinoProductivoRepo.findOne.mockResolvedValue(null);

      const result = await service.generarRecomendacion({
        empresaId: 1,
        loteId: 10,
        parametros: [{ parametro: Parametro.GRASA, valor: 3.8 }],
      });

      expect(result).toBeNull();
      expect(mockDestinoProductivoRepo.findOne).toHaveBeenCalledWith({
        where: { empresaId: 1, nombre: 'Queso Inexistente' },
      });
    });

    it('debe crear y guardar la recomendación correctamente en el caso exitoso', async () => {
      const destinoMock = { id: 2, nombre: 'Manteca' };
      mockMlClient.predecirDestino.mockResolvedValue({
        status: 'success',
        destinoRecomendado: 'Manteca',
        confianza: 0.95,
      });
      mockDestinoProductivoRepo.findOne.mockResolvedValue(destinoMock);
      mockRecomendacionRepo.create.mockReturnValue({
        lote: { id: 10 },
        empresa: { id: 1 },
        loteConsumo: null,
        destinoRecomendado: destinoMock,
        confianza: 0.95,
      });
      mockRecomendacionRepo.save.mockResolvedValue({
        id: 100,
        lote: { id: 10 },
        empresa: { id: 1 },
        destinoRecomendado: destinoMock,
        confianza: 0.95,
      });

      const result = await service.generarRecomendacion({
        empresaId: 1,
        loteId: 10,
        parametros: [{ parametro: Parametro.GRASA, valor: 3.8 }],
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe(100);
      expect(mockRecomendacionRepo.create).toHaveBeenCalledWith({
        lote: { id: 10 },
        empresa: { id: 1 },
        loteConsumo: null,
        destinoRecomendado: destinoMock,
        confianza: 0.95,
      });
      expect(mockRecomendacionRepo.save).toHaveBeenCalled();
    });
  });

  describe('responderRecomendacion', () => {
    it('debe lanzar NotFoundException si la recomendación no existe para el tenant', async () => {
      mockRecomendacionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.responderRecomendacion(99, { aceptada: true }, tenant, 5),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ConflictException si la recomendación ya no está en estado pendiente', async () => {
      mockRecomendacionRepo.findOne.mockResolvedValue({
        id: 10,
        estado: 'aceptada',
      });

      await expect(
        service.responderRecomendacion(10, { aceptada: true }, tenant, 5),
      ).rejects.toThrow(ConflictException);
    });

    it('debe lanzar BadRequestException si se rechaza indicando el mismo destino que el recomendado', async () => {
      mockRecomendacionRepo.findOne.mockResolvedValue({
        id: 20,
        estado: 'pendiente',
        destinoRecomendadoId: 1,
      });

      await expect(
        service.responderRecomendacion(
          20,
          { aceptada: false, destinoRealId: 1, justificacion: justificacionValida },
          tenant,
          5,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si el destinoReal elegido no existe para la empresa', async () => {
      mockRecomendacionRepo.findOne.mockResolvedValue({
        id: 21,
        estado: 'pendiente',
        destinoRecomendadoId: 1,
      });
      mockDestinoProductivoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.responderRecomendacion(
          21,
          { aceptada: false, destinoRealId: 999, justificacion: justificacionValida },
          tenant,
          5,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('al rechazar correctamente, debe guardar el estado rechazada y la justificación', async () => {
      const recomendacionMock = {
        id: 30,
        estado: 'pendiente',
        destinoRecomendadoId: 1,
        loteConsumoId: 50,
        lote: { id: 10 },
      };
      const destinoRealMock = { id: 2, nombre: 'Descarte' };

      mockRecomendacionRepo.findOne.mockResolvedValue(recomendacionMock);
      mockDestinoProductivoRepo.findOne.mockResolvedValue(destinoRealMock);
      mockRecomendacionRepo.save.mockImplementation((r) => Promise.resolve(r));

      const result = await service.responderRecomendacion(
        30,
        { aceptada: false, destinoRealId: 2, justificacion: justificacionValida },
        tenant,
        5,
      );

      expect(result.estado).toBe('rechazada');
      expect(result.destinoRealId).toBe(2);
      expect(result.justificacion).toBe(justificacionValida);
      expect(result.usuarioId).toBe(5);
    });

    it('al aceptar para lote original (loteConsumoId null), debe actualizar el lote y guardar historial', async () => {
      const recomendacionMock = {
        id: 40,
        estado: 'pendiente',
        destinoRecomendadoId: 3,
        loteConsumoId: null,
        lote: { id: 10 },
      };
      const destinoRealMock = { id: 3, nombre: 'Queso' };
      const loteMock = { id: 10, empresaId: 1, destinoProductivoId: 1 };
      const historialMock = { id: 1 };

      mockRecomendacionRepo.findOne.mockResolvedValue(recomendacionMock);
      mockDestinoProductivoRepo.findOne.mockResolvedValue(destinoRealMock);
      mockLoteRepo.findOne.mockResolvedValue(loteMock);
      mockLoteDestinoHistorialRepo.create.mockReturnValue(historialMock);
      mockRecomendacionRepo.save.mockImplementation((r) => Promise.resolve(r));

      const result = await service.responderRecomendacion(
        40,
        { aceptada: true },
        tenant,
        5,
      );

      expect(result.estado).toBe('aceptada');
      expect(mockLoteRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 10, destinoProductivoId: 3 }),
      );
      expect(mockLoteDestinoHistorialRepo.create).toHaveBeenCalledWith({
        loteId: 10,
        empresaId: 1,
        destinoProductivoId: 3,
        destinoAnteriorId: 1,
        usuarioId: 5,
        origen: 'recomendacion_ml',
        recomendacionDestinoId: 40,
      });
      expect(mockLoteDestinoHistorialRepo.save).toHaveBeenCalledWith(historialMock);
    });

    it('si el lote no se encuentra al ser loteConsumoId null, debe lanzar NotFoundException', async () => {
      mockRecomendacionRepo.findOne.mockResolvedValue({
        id: 41,
        estado: 'pendiente',
        destinoRecomendadoId: 3,
        loteConsumoId: null,
        lote: { id: 10 },
      });
      mockDestinoProductivoRepo.findOne.mockResolvedValue({ id: 3, nombre: 'Queso' });
      mockLoteRepo.findOne.mockResolvedValue(null);

      await expect(
        service.responderRecomendacion(41, { aceptada: true }, tenant, 5),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('recomendacionPendientePorLote', () => {
    it('debe lanzar NotFoundException si el lote no existe para el tenant', async () => {
      mockLoteRepo.findOne.mockResolvedValue(null);

      await expect(
        service.recomendacionPendientePorLote(5, tenant),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe devolver null si el lote existe pero no tiene recomendación pendiente', async () => {
      mockLoteRepo.findOne.mockResolvedValue({ id: 5, empresaId: 1 });
      mockRecomendacionRepo.findOne.mockResolvedValue(null);

      const result = await service.recomendacionPendientePorLote(5, tenant);

      expect(result).toBeNull();
      expect(mockRecomendacionRepo.findOne).toHaveBeenCalledWith({
        where: {
          lote: { id: 5 },
          empresa: { id: 1 },
          estado: 'pendiente',
          loteConsumoId: IsNull(),
        },
        relations: {
          destinoRecomendado: true,
          destinoReal: true,
        },
        order: { createdAt: 'DESC' },
      });
    });

    it('debe devolver el DTO mapeado correctamente si existe la recomendación', async () => {
      mockLoteRepo.findOne.mockResolvedValue({ id: 5, empresaId: 1 });
      mockRecomendacionRepo.findOne.mockResolvedValue({
        id: 100,
        confianza: 0.88,
        estado: 'pendiente',
        destinoRecomendado: { id: 2, nombre: 'Manteca' },
        destinoReal: null,
        justificacion: null,
      });

      const result = await service.recomendacionPendientePorLote(5, tenant);

      expect(result).toBeDefined();
      expect(result?.id).toBe(100);
      expect(result?.confianza).toBe(0.88);
      expect(result?.destinoRecomendado).toEqual({ id: 2, nombre: 'Manteca' });
    });
  });

  describe('historialAciertos', () => {
    it('debe retornar total 0, aciertos 0 y tasaAcierto 0 cuando no hay registros aceptados', async () => {
      mockRecomendacionRepo.find.mockResolvedValue([]);

      const result = await service.historialAciertos(tenant);

      expect(result).toEqual({
        total: 0,
        aciertos: 0,
        tasaAcierto: 0,
      });
    });

    it('debe calcular correctamente la tasa de aciertos comparando destinoRecomendadoId y destinoRealId', async () => {
      mockRecomendacionRepo.find.mockResolvedValue([
        { estado: 'aceptada', destinoRecomendadoId: 1, destinoRealId: 1 },
        { estado: 'aceptada', destinoRecomendadoId: 1, destinoRealId: 1 },
        { estado: 'aceptada', destinoRecomendadoId: 1, destinoRealId: 2 },
      ]);

      const result = await service.historialAciertos(tenant);

      expect(result.total).toBe(3);
      expect(result.aciertos).toBe(2);
      expect(result.tasaAcierto).toBeCloseTo(0.6667, 4);
    });
  });

  describe('historialDivergencias', () => {
    it('debe mapear y retornar el listado de recomendaciones rechazadas', async () => {
      const fecha = new Date();
      mockRecomendacionRepo.find.mockResolvedValue([
        {
          id: 1,
          destinoRecomendadoId: 1,
          destinoRecomendado: { id: 1, nombre: 'Manteca' },
          destinoRealId: 2,
          destinoReal: { id: 2, nombre: 'Queso' },
          justificacion: 'Stock lleno',
          usuarioId: 10,
          respondidaEn: fecha,
          lote: { id: 5, codigo: 'LOTE-005' },
        },
      ]);

      const result = await service.historialDivergencias(tenant);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        recomendacionId: 1,
        loteId: 5,
        loteCodigo: 'LOTE-005',
        destinoRecomendadoId: 1,
        destinoRecomendadoNombre: 'Manteca',
        destinoRealId: 2,
        destinoRealNombre: 'Queso',
        justificacion: 'Stock lleno',
        usuarioId: 10,
        respondidaEn: fecha,
      });
    });
  });

  describe('obtenerTodas', () => {
    it('debe mapear y listar todas las recomendaciones de la empresa', async () => {
      const fecha = new Date();
      mockRecomendacionRepo.find.mockResolvedValue([
        {
          id: 10,
          lote: { id: 1, codigo: 'LOTE-001' },
          estado: 'pendiente',
          destinoRecomendadoId: 1,
          destinoRecomendado: { id: 1, nombre: 'Dulce' },
          destinoRealId: null,
          destinoReal: null,
          confianza: 0.9,
          justificacion: null,
          usuarioId: null,
          createdAt: fecha,
          respondidaEn: null,
        },
      ]);

      const result = await service.obtenerTodas(tenant);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        recomendacionId: 10,
        loteId: 1,
        loteCodigo: 'LOTE-001',
        estado: 'pendiente',
        destinoRecomendadoId: 1,
        destinoRecomendadoNombre: 'Dulce',
        destinoRealId: null,
        destinoRealNombre: null,
        confianza: 0.9,
        justificacion: null,
        usuarioId: null,
        createdAt: fecha,
        respondidaEn: null,
      });
    });
  });
});