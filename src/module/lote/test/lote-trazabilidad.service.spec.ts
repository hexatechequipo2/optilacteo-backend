import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoteTrazabilidadService } from '../lote-trazabilidad.service';
import { LOTE_REPOSITORY } from '../repository/lote-repository.interface';
import { LoteRevisionCalidad } from '../entities/lote-revision-calidad.entity';
import { LoteUbicacionHistorial } from '../entities/lote-ubicacion-historial.entity';
import { IngresoCamara } from '../entities/ingreso-camara.entity';
import { ClasificacionLoteService } from '../clasificacion-lote.service';
import { LoteConsumoService } from '../lote-consumo.service';
import { EstadoLote } from '../enums/estado-lote.enum';
import { TipoEventoTrazabilidad } from '../enums/tipo-evento-trazabilidad.enum';
import type { TenantContext } from '../../../common/types/tenant-context.type';

const mockLoteRepository = {
  findById: jest.fn(),
};

const mockLoteRevisionRepository = {
  find: jest.fn(),
};

const mockUbicacionHistorialRepository = {
  find: jest.fn(),
};

const mockIngresoCamaraRepository = {
  find: jest.fn(),
};

const mockClasificacionLoteService = {
  historialDeLote: jest.fn(),
};

const mockLoteConsumoService = {
  historial: jest.fn(),
};

describe('LoteTrazabilidadService — trazabilidad completa de lotes', () => {
  let service: LoteTrazabilidadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoteTrazabilidadService,
        {
          provide: LOTE_REPOSITORY,
          useValue: mockLoteRepository,
        },
        {
          provide: getRepositoryToken(LoteRevisionCalidad),
          useValue: mockLoteRevisionRepository,
        },
        {
          provide: getRepositoryToken(LoteUbicacionHistorial),
          useValue: mockUbicacionHistorialRepository,
        },
        {
          provide: getRepositoryToken(IngresoCamara),
          useValue: mockIngresoCamaraRepository,
        },
        {
          provide: ClasificacionLoteService,
          useValue: mockClasificacionLoteService,
        },
        {
          provide: LoteConsumoService,
          useValue: mockLoteConsumoService,
        },
      ],
    }).compile();

    service = module.get<LoteTrazabilidadService>(LoteTrazabilidadService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Consulta de trazabilidad', () => {
    it('cuando el lote existe, debe reconstruir su historial completo en orden cronológico', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      const lote = {
        id: 5,
        codigo: 'LOT-001',
        fechaIngreso: new Date('2026-08-01T08:00:00'),
        materiaPrima: 'LECHE',
        proveedorId: 2,
        tamboId: 3,
        cantidad: 100,
        cantidadComprometidaKg: 120,
        parametros: [
          {
            parametro: 'TEMPERATURA',
            valor: 4,
            valorComprometido: 5,
          },
        ],
        estado: EstadoLote.FINALIZADO,
        updatedAt: new Date('2026-08-05T15:00:00'),
        rendimiento: 95,
        unidadRendimiento: 'KG',
      };

      mockLoteRepository.findById.mockResolvedValue(lote);

      mockClasificacionLoteService.historialDeLote.mockResolvedValue([
        {
          clasificacion: 'APROBADO',
          createdAt: new Date('2026-08-01T09:00:00'),
          parametrosUtilizados: [],
        },
      ]);

      mockLoteRevisionRepository.find.mockResolvedValue([
        {
          decision: 'APROBADO',
          justificacion: 'Cumple los parámetros',
          usuarioId: 7,
          createdAt: new Date('2026-08-01T10:00:00'),
        },
      ]);

      mockUbicacionHistorialRepository.find.mockResolvedValue([
        {
          fecha: new Date('2026-08-02T10:00:00'),
          sensorId: 2,
          ubicacionAnterior: 'Recepción',
          ubicacionNueva: 'Cámara 1',
          userId: 7,
        },
      ]);

      mockIngresoCamaraRepository.find.mockResolvedValue([
        {
          skuId: 10,
          cantidad: 50,
          fechaIngreso: new Date('2026-08-03T10:00:00'),
          sku: {
            nombre: 'Leche Entera 1L',
          },
        },
      ]);

      mockLoteConsumoService.historial.mockResolvedValue([
        {
          cantidad: 40,
          loteProduccionId: 8,
          loteProduccionCodigo: 'PROD-1-00001',
          parametros: [],
          createdAt: new Date('2026-08-04T10:00:00'),
        },
      ]);

      const result = await service.getTrazabilidad(5, tenant);

      expect(mockLoteRepository.findById).toHaveBeenCalledWith(5, 1);

      expect(mockClasificacionLoteService.historialDeLote).toHaveBeenCalledWith(
        5,
        1,
      );

      expect(mockLoteRevisionRepository.find).toHaveBeenCalledWith({
        where: {
          loteId: 5,
          empresaId: 1,
        },
        order: {
          createdAt: 'ASC',
        },
      });

      expect(mockUbicacionHistorialRepository.find).toHaveBeenCalledWith({
        where: {
          loteId: 5,
          empresaId: 1,
        },
        order: {
          fecha: 'ASC',
        },
      });

      expect(mockIngresoCamaraRepository.find).toHaveBeenCalledWith({
        where: {
          loteId: 5,
          empresaId: 1,
        },
        relations: {
          sku: true,
        },
        order: {
          fechaIngreso: 'ASC',
        },
      });

      expect(mockLoteConsumoService.historial).toHaveBeenCalledWith(5, tenant);

      expect(result.loteId).toBe(5);
      expect(result.codigoLote).toBe('LOT-001');

      expect(result.eventos).toHaveLength(7);

      expect(result.eventos[0].tipo).toBe(TipoEventoTrazabilidad.RECEPCION);

      expect(result.eventos.at(-1)?.tipo).toBe(
        TipoEventoTrazabilidad.FINALIZACION,
      );

      for (let i = 1; i < result.eventos.length; i++) {
        expect(result.eventos[i].fecha.getTime()).toBeGreaterThanOrEqual(
          result.eventos[i - 1].fecha.getTime(),
        );
      }
    });

    it('cuando el lote no existe para la empresa autenticada, debe lanzar NotFoundException', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      mockLoteRepository.findById.mockResolvedValue(null);

      await expect(service.getTrazabilidad(999, tenant)).rejects.toThrow(
        NotFoundException,
      );

      expect(
        mockClasificacionLoteService.historialDeLote,
      ).not.toHaveBeenCalled();
    });

    it('cuando el usuario no tiene una empresa determinada, debe lanzar BadRequestException', async () => {
      const tenant = {} as TenantContext;

      await expect(service.getTrazabilidad(5, tenant)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockLoteRepository.findById).not.toHaveBeenCalled();
    });

    it('cuando el lote no está finalizado, no debe incluir el evento de finalización', async () => {
      const tenant = {
        empresaId: 1,
      } as TenantContext;

      mockLoteRepository.findById.mockResolvedValue({
        id: 5,
        codigo: 'LOT-001',
        fechaIngreso: new Date('2026-08-01'),
        materiaPrima: 'LECHE',
        proveedorId: 2,
        tamboId: 3,
        cantidad: 100,
        estado: EstadoLote.EN_PROCESO,
        parametros: [],
      });

      mockClasificacionLoteService.historialDeLote.mockResolvedValue([]);
      mockLoteRevisionRepository.find.mockResolvedValue([]);
      mockUbicacionHistorialRepository.find.mockResolvedValue([]);
      mockIngresoCamaraRepository.find.mockResolvedValue([]);
      mockLoteConsumoService.historial.mockResolvedValue([]);

      const result = await service.getTrazabilidad(5, tenant);

      expect(result.eventos).toHaveLength(1);

      expect(result.eventos[0].tipo).toBe(TipoEventoTrazabilidad.RECEPCION);

      expect(
        result.eventos.some(
          (evento) => evento.tipo === TipoEventoTrazabilidad.FINALIZACION,
        ),
      ).toBe(false);
    });
  });
});
