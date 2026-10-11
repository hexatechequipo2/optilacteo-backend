import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoteTrazabilidadService } from '../lote-trazabilidad.service';
import { LOTE_REPOSITORY } from '../repository/lote-repository.interface';
import { LoteRevisionCalidad } from '../entities/lote-revision-calidad.entity';
import { LoteUbicacionHistorial } from '../entities/lote-ubicacion-historial.entity';
import { IngresoCamara } from '../entities/ingreso-camara.entity';
import { RecomendacionDestino } from '../../ml/entities/recomendacion-destino.entity'; 
import { Empresa } from '../../empresa/entities/empresa.entity';
import { ClasificacionLoteService } from '../clasificacion-lote.service';
import { LoteConsumoService } from '../lote-consumo.service';
import { TrazabilidadPdfBuilder } from '../pdf/trazabilidad-pdf.builder';
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

const mockRecomendacionRepository = { 
  find: jest.fn(),
};

const mockEmpresaRepository = {
  findOneBy: jest.fn(),
};

const mockClasificacionLoteService = {
  historialDeLote: jest.fn(),
};

const mockLoteConsumoService = {
  historial: jest.fn(),
};

const mockPdfBuilder = {
  build: jest.fn(),
};

describe('LoteTrazabilidadService — trazabilidad completa de lotes', () => {
  let service: LoteTrazabilidadService;

  beforeEach(async () => {
    mockRecomendacionRepository.find.mockResolvedValue([]); 

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
          provide: getRepositoryToken(RecomendacionDestino), 
          useValue: mockRecomendacionRepository,
        },
        {
          provide: getRepositoryToken(Empresa),
          useValue: mockEmpresaRepository,
        },
        {
          provide: ClasificacionLoteService,
          useValue: mockClasificacionLoteService,
        },
        {
          provide: LoteConsumoService,
          useValue: mockLoteConsumoService,
        },
        {
          provide: TrazabilidadPdfBuilder,
          useValue: mockPdfBuilder,
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
  describe('Recomendaciones de destino', () => {
    const tenant = { empresaId: 1 } as TenantContext;

    const prepararLote = () => {
      mockLoteRepository.findById.mockResolvedValue({
        id: 5,
        codigo: 'LOT-001',
        fechaIngreso: new Date('2026-08-01T08:00:00'),
        materiaPrima: 'LECHE',
        proveedorId: 2,
        tamboId: 3,
        cantidad: 100,
        parametros: [],
        estado: EstadoLote.EN_PROCESO,
        updatedAt: new Date('2026-08-05T15:00:00'),
      });

      mockClasificacionLoteService.historialDeLote.mockResolvedValue([]);
      mockLoteRevisionRepository.find.mockResolvedValue([]);
      mockUbicacionHistorialRepository.find.mockResolvedValue([]);
      mockIngresoCamaraRepository.find.mockResolvedValue([]);
      mockLoteConsumoService.historial.mockResolvedValue([]);
    };

    it('omite las recomendaciones pendientes', async () => {
      prepararLote();

      mockRecomendacionRepository.find.mockResolvedValue([
        {
          estado: 'pendiente',
          destinoRecomendadoId: 10,
          destinoRealId: null,
          destinoRecomendado: { nombre: 'Cámara A' },
          destinoReal: null,
          createdAt: new Date('2026-08-01T09:00:00'),
          respondidaEn: null,
        },
      ]);

      const result = await service.getTrazabilidad(5, tenant);

      expect(
        result.eventos.filter(
          (evento) =>
            evento.tipo === TipoEventoTrazabilidad.RECOMENDACION_DESTINO,
        ),
      ).toHaveLength(0);
    });

    it('registra una recomendación aceptada cuando coinciden los destinos', async () => {
      prepararLote();

      const respondidaEn = new Date('2026-08-01T10:00:00');

      mockRecomendacionRepository.find.mockResolvedValue([
        {
          estado: 'aceptada',
          destinoRecomendadoId: 10,
          destinoRealId: 10,
          destinoRecomendado: { nombre: 'Cámara A' },
          destinoReal: { nombre: 'Cámara A' },
          createdAt: new Date('2026-08-01T09:00:00'),
          respondidaEn,
          justificacion: 'Destino correcto',
          usuarioId: 7,
        },
      ]);

      const result = await service.getTrazabilidad(5, tenant);

      expect(result.eventos).toContainEqual(
        expect.objectContaining({
          tipo: TipoEventoTrazabilidad.RECOMENDACION_DESTINO,
          fecha: respondidaEn,
          descripcion: 'Destino recomendado aceptado (Cámara A)',
          detalle: expect.objectContaining({
            destinoRecomendadoId: 10,
            destinoRecomendadoNombre: 'Cámara A',
            destinoRealId: 10,
            destinoRealNombre: 'Cámara A',
            divergencia: false,
            justificacion: 'Destino correcto',
            usuarioId: 7,
          }),
        }),
      );
    });

    it('registra una divergencia cuando el destino real es distinto del recomendado', async () => {
      prepararLote();

      const respondidaEn = new Date('2026-08-01T10:00:00');

      mockRecomendacionRepository.find.mockResolvedValue([
        {
          estado: 'rechazada',
          destinoRecomendadoId: 10,
          destinoRealId: 20,
          destinoRecomendado: { nombre: 'Cámara A' },
          destinoReal: { nombre: 'Cámara B' },
          createdAt: new Date('2026-08-01T09:00:00'),
          respondidaEn,
          justificacion: 'Cámara A ocupada',
          usuarioId: 8,
        },
      ]);

      const result = await service.getTrazabilidad(5, tenant);

      expect(result.eventos).toContainEqual(
        expect.objectContaining({
          tipo: TipoEventoTrazabilidad.RECOMENDACION_DESTINO,
          fecha: respondidaEn,
          descripcion:
            'Divergencia: destino elegido distinto al recomendado (Cámara A → Cámara B)',
          detalle: expect.objectContaining({
            destinoRecomendadoId: 10,
            destinoRealId: 20,
            divergencia: true,
            destinoRealNombre: 'Cámara B',
          }),
        }),
      );
    });

    it('usa createdAt cuando respondidaEn es null', async () => {
      prepararLote();

      const createdAt = new Date('2026-08-01T09:00:00');

      mockRecomendacionRepository.find.mockResolvedValue([
        {
          estado: 'aceptada',
          destinoRecomendadoId: 10,
          destinoRealId: 10,
          destinoRecomendado: { nombre: 'Cámara A' },
          destinoReal: { nombre: 'Cámara A' },
          createdAt,
          respondidaEn: null,
          justificacion: null,
          usuarioId: 7,
        },
      ]);

      const result = await service.getTrazabilidad(5, tenant);

      expect(result.eventos).toContainEqual(
        expect.objectContaining({
          tipo: TipoEventoTrazabilidad.RECOMENDACION_DESTINO,
          fecha: createdAt,
        }),
      );
    });

    it('contempla que destinoReal no tenga nombre asociado', async () => {
      prepararLote();

      mockRecomendacionRepository.find.mockResolvedValue([
        {
          estado: 'rechazada',
          destinoRecomendadoId: 10,
          destinoRealId: 20,
          destinoRecomendado: { nombre: 'Cámara A' },
          destinoReal: null,
          createdAt: new Date('2026-08-01T09:00:00'),
          respondidaEn: null,
          justificacion: null,
          usuarioId: 7,
        },
      ]);

      const result = await service.getTrazabilidad(5, tenant);

      expect(result.eventos).toContainEqual(
        expect.objectContaining({
          tipo: TipoEventoTrazabilidad.RECOMENDACION_DESTINO,
          descripcion:
            'Divergencia: destino elegido distinto al recomendado (Cámara A → undefined)',
          detalle: expect.objectContaining({
            destinoRealNombre: undefined,
            divergencia: true,
          }),
        }),
      );
    });
  });
});