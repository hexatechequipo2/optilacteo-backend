import { Test, TestingModule } from '@nestjs/testing';
import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { NotificacionesController } from '../notificaciones.controller';
import { NotificacionesService } from '../notificaciones.service';
import { ConfiguracionAlertaDesconexionService } from '../configuracion-alerta-desconexion.service';
import { TenantContext } from '../../../common/types/tenant-context.type';
import { NotificacionFilterQueryDto } from '../dto/notificacion-filter-query.dto';
import { CrearConfiguracionNotificacionDto } from '../dto/crear-configuracion-notificacion.dto';
import { HistorialAlertasQueryDto } from '../dto/historial-alertas-query.dto';
import { ResolverAlertaDto } from '../dto/resolver-alerta.dto';
import { ActualizarConfiguracionAlertaDesconexionDto } from '../dto/actualizar-configuracion-alerta-desconexion.dto';

describe('NotificacionesController', () => {
  let controller: NotificacionesController;
  let mockNotificacionesService: Record<string, jest.Mock>;
  let mockConfiguracionAlertaDesconexionService: Record<string, jest.Mock>;

  const mockTenantContext: TenantContext = {
    empresaId: 1,
    sub: 'user-uuid-1',
  } as any;

  const mockReq = {
    user: { sub: 'user-uuid-1' },
  };

  beforeEach(async () => {
    mockNotificacionesService = {
      listarPorUsuario: jest.fn(),
      marcarLeida: jest.fn(),
      contarNoLeidas: jest.fn(),
      listarConfiguracion: jest.fn(),
      crearConfiguracion: jest.fn(),
      eliminarConfiguracion: jest.fn(),
      obtenerHistorial: jest.fn(),
      exportarHistorialCsv: jest.fn(),
      exportarHistorialPdf: jest.fn(),
      resolverAlerta: jest.fn(),
    };

    mockConfiguracionAlertaDesconexionService = {
      obtenerOCrear: jest.fn(),
      actualizar: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificacionesController],
      providers: [
        {
          provide: NotificacionesService,
          useValue: mockNotificacionesService,
        },
        {
          provide: ConfiguracionAlertaDesconexionService,
          useValue: mockConfiguracionAlertaDesconexionService,
        },
      ],
    }).compile();

    controller = module.get<NotificacionesController>(NotificacionesController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findMine', () => {
    it('debe delegar la consulta de notificaciones del usuario autenticado al servicio', async () => {
      const queryDto: NotificacionFilterQueryDto = { page: 1, limit: 10 };
      mockNotificacionesService.listarPorUsuario.mockResolvedValue([]);

      const resultado = await controller.findMine(queryDto, mockTenantContext, mockReq);

      expect(mockNotificacionesService.listarPorUsuario).toHaveBeenCalledWith(
        'user-uuid-1',
        1,
        queryDto,
      );
      expect(resultado).toEqual([]);
    });
  });

  describe('marcarLeida', () => {
    it('debe parsear el id a entero y marcar la notificación como leída', async () => {

      mockNotificacionesService.marcarLeida.mockResolvedValue({ id: 5, leida: true });

      const resultado = await controller.marcarLeida('5', mockTenantContext, mockReq);

      expect(mockNotificacionesService.marcarLeida).toHaveBeenCalledWith(5, 'user-uuid-1', 1);
      expect(resultado).toEqual({ id: 5, leida: true });
    });
  });

  describe('contarNoLeidas', () => {
    it('debe delegar el conteo de notificaciones no leídas al servicio', async () => {
      mockNotificacionesService.contarNoLeidas.mockResolvedValue({ count: 3 });

      const resultado = await controller.contarNoLeidas(mockTenantContext, mockReq);

      expect(mockNotificacionesService.contarNoLeidas).toHaveBeenCalledWith('user-uuid-1', 1);
      expect(resultado).toEqual({ count: 3 });
    });
  });

  describe('listarConfiguracion y crearConfiguracion', () => {
    it('debe listar la configuración de alertas del tenant', async () => {
      mockNotificacionesService.listarConfiguracion.mockResolvedValue([]);

      const resultado = await controller.listarConfiguracion(mockTenantContext);

      expect(mockNotificacionesService.listarConfiguracion).toHaveBeenCalledWith(1);
      expect(resultado).toEqual([]);
    });

    it('debe delegar la creación de una configuración de notificación', async () => {
      const dto: CrearConfiguracionNotificacionDto = { canal: 'EMAIL' } as any;
      mockNotificacionesService.crearConfiguracion.mockResolvedValue({ id: 1, ...dto });

      const resultado = await controller.crearConfiguracion(dto, mockTenantContext);

      expect(mockNotificacionesService.crearConfiguracion).toHaveBeenCalledWith(1, dto);
      expect(resultado).toEqual({ id: 1, ...dto });
    });

    it('debe eliminar la configuración parseando el ID numérico', async () => {
      mockNotificacionesService.eliminarConfiguracion.mockResolvedValue({ success: true });

      const resultado = await controller.eliminarConfiguracion('10', mockTenantContext);

      expect(mockNotificacionesService.eliminarConfiguracion).toHaveBeenCalledWith(10, 1);
      expect(resultado).toEqual({ success: true });
    });
  });

  describe('Historial de Alertas (HU-27 + HU-28)', () => {
    it('obtenerHistorial: debe solicitar el historial con los filtros del DTO y el tenant', async () => {
      const query: HistorialAlertasQueryDto = { page: 1 };
      mockNotificacionesService.obtenerHistorial.mockResolvedValue({ data: [] });

      const resultado = await controller.obtenerHistorial(query, mockTenantContext);

      expect(mockNotificacionesService.obtenerHistorial).toHaveBeenCalledWith(1, query);
      expect(resultado).toEqual({ data: [] });
    });

    it('exportarHistorialCsv: debe configurar los headers HTTP correctos y escribir el buffer en la respuesta', async () => {
      const query: HistorialAlertasQueryDto = {};
      const mockBuffer = Buffer.from('id,alerta\n1,Test');
      mockNotificacionesService.exportarHistorialCsv.mockResolvedValue(mockBuffer);

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      await controller.exportarHistorialCsv(query, mockTenantContext, mockRes);

      expect(mockNotificacionesService.exportarHistorialCsv).toHaveBeenCalledWith(1, query);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="historial-alertas.csv"',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Length', mockBuffer.length);
      expect(mockRes.end).toHaveBeenCalledWith(mockBuffer);
    });

    it('exportarHistorialPdf: debe retornar un StreamableFile con los headers de PDF', async () => {
      const query: HistorialAlertasQueryDto = {};
      const mockBuffer = Buffer.from('PDF_DUMMY_CONTENT');
      mockNotificacionesService.exportarHistorialPdf.mockResolvedValue(mockBuffer);

      const mockRes = {
        set: jest.fn(),
      } as unknown as Response;

      const resultado = await controller.exportarHistorialPdf(query, mockTenantContext, mockRes);

      expect(mockNotificacionesService.exportarHistorialPdf).toHaveBeenCalledWith(1, query);
      expect(mockRes.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="historial-alertas.pdf"',
        'Content-Length': mockBuffer.length,
      });
      expect(resultado).toBeInstanceOf(StreamableFile);
    });
  });

  describe('resolverAlerta (HU-27)', () => {
    it('debe delegar la resolución de una alerta enviando ID numérico, usuario y DTO', async () => {
      const dto: ResolverAlertaDto = { comentario: 'Resuelto' } as any;
      mockNotificacionesService.resolverAlerta.mockResolvedValue({ id: 3, resuelta: true });

      const resultado = await controller.resolverAlerta('3', dto, mockTenantContext, mockReq);

      expect(mockNotificacionesService.resolverAlerta).toHaveBeenCalledWith(
        3,
        1,
        'user-uuid-1',
        dto,
      );
      expect(resultado).toEqual({ id: 3, resuelta: true });
    });
  });

  describe('Configuración de Alerta de Desconexión (HU-31)', () => {
    it('obtenerConfiguracionAlertaDesconexion: debe solicitar la configuración por empresa', async () => {
      mockConfiguracionAlertaDesconexionService.obtenerOCrear.mockResolvedValue({
        empresaId: 1,
        umbralMinutos: 15,
      });

      const resultado = await controller.obtenerConfiguracionAlertaDesconexion(
        mockTenantContext,
      );

      expect(
        mockConfiguracionAlertaDesconexionService.obtenerOCrear,
      ).toHaveBeenCalledWith(1);
      expect(resultado).toEqual({ empresaId: 1, umbralMinutos: 15 });
    });

    it('actualizarConfiguracionAlertaDesconexion: debe enviar los nuevos parámetros de umbral al servicio', async () => {
      const dto: ActualizarConfiguracionAlertaDesconexionDto = { umbralMinutos: 25 };
      mockConfiguracionAlertaDesconexionService.actualizar.mockResolvedValue({
        empresaId: 1,
        umbralMinutos: 25,
      });

      const resultado = await controller.actualizarConfiguracionAlertaDesconexion(
        dto,
        mockTenantContext,
      );

      expect(
        mockConfiguracionAlertaDesconexionService.actualizar,
      ).toHaveBeenCalledWith(1, 25);
      expect(resultado).toEqual({ empresaId: 1, umbralMinutos: 25 });
    });
  });
});