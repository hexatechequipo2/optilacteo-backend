import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificacionesService } from '../notificaciones.service';
import { NOTIFICACION_REPOSITORY } from '../repository/notificacion.repository.interface';
import { CONFIGURACION_NOTIFICACION_REPOSITORY } from '../repository/configuracion-notificacion-nivel.repository.interface';
import { User } from '../../user/entities/user.entity';
import { NotificacionesGateway } from '../gateway/notificaciones.gateway';
import { TipoNotificacion } from '../enums/tipo-notificacion.enum';
import { NivelAlerta } from '../enums/nivel-alerta.enum';
import { EstadoAlerta } from '../enums/estado-alerta.enum';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { ROLES } from '../../rol/constants/roles.constants';

describe('NotificacionesService', () => {
  let service: NotificacionesService;

  let mockNotificacionRepository: {
    create: jest.Mock;
    findByUsuario: jest.Mock;
    markAsLeida: jest.Mock;
    countNoLeidas: jest.Mock;
    findAlertaAbiertaPorLoteYParametro: jest.Mock;
    findAlertaAbiertaPorSensor: jest.Mock;
    cerrarAlertasAbiertasPorSensor: jest.Mock;
    findById: jest.Mock;
    resolver: jest.Mock;
    findHistorial: jest.Mock;
    findHistorialCompleto: jest.Mock;
  };

  let mockConfiguracionRepository: {
    findByEmpresa: jest.Mock;
    findDestinatariosConfigByNivel: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
    countByNivel: jest.Mock;
    delete: jest.Mock;
  };

  let mockUserRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  let mockGateway: {
    emitirNotificacion: jest.Mock;
  };

  beforeEach(async () => {
    mockNotificacionRepository = {
      create: jest.fn(),
      findByUsuario: jest.fn(),
      markAsLeida: jest.fn(),
      countNoLeidas: jest.fn(),
      findAlertaAbiertaPorLoteYParametro: jest.fn(),
      findAlertaAbiertaPorSensor: jest.fn(),
      cerrarAlertasAbiertasPorSensor: jest.fn(),
      findById: jest.fn(),
      resolver: jest.fn(),
      findHistorial: jest.fn(),
      findHistorialCompleto: jest.fn(),
    };

    mockConfiguracionRepository = {
      findByEmpresa: jest.fn(),
      findDestinatariosConfigByNivel: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      countByNivel: jest.fn(),
      delete: jest.fn(),
    };

    mockUserRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockGateway = {
      emitirNotificacion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacionesService,
        {
          provide: NOTIFICACION_REPOSITORY,
          useValue: mockNotificacionRepository,
        },
        {
          provide: CONFIGURACION_NOTIFICACION_REPOSITORY,
          useValue: mockConfiguracionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: NotificacionesGateway,
          useValue: mockGateway,
        },
      ],
    }).compile();

    service = module.get<NotificacionesService>(NotificacionesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('notificarResponsablesCalidad', () => {
    it('debe notificar a todos los usuarios activos con rol de Responsable de Calidad y emitir evento por Gateway', async () => {
      const empresaId = 1;
      const usuarios = [{ id: 10 }, { id: 20 }] as User[];
      mockUserRepository.find.mockResolvedValue(usuarios);
      mockNotificacionRepository.create.mockImplementation((entity) =>
        Promise.resolve({ id: 99, ...entity }),
      );

      await service.notificarResponsablesCalidad(
        empresaId,
        'NUEVA_NOTIFICACION' as TipoNotificacion,
        'Mensaje de prueba',
      );

      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: {
          empresa: { id: empresaId },
          rol: { nombre: ROLES.RESPONSABLE_CALIDAD },
          isActive: true,
        },
        relations: { rol: true, empresa: true },
      });
      expect(mockNotificacionRepository.create).toHaveBeenCalledTimes(2);
      expect(mockGateway.emitirNotificacion).toHaveBeenCalledTimes(2);
    });
  });

  describe('generarAlertaPorUmbral', () => {
    const paramsBase = {
      empresaId: 1,
      loteId: 100,
      loteCodigo: 'L-001',
      parametro: Parametro.TEMPERATURA,
      materiaPrima: 'LECHE' as TipoMateriaPrima,
      valor: 8,
      umbralMin: 2,
      umbralMax: 6,
    };

    it('cuando el valor está dentro del rango, no debe generar ninguna alerta', async () => {
      const resultado = await service.generarAlertaPorUmbral({
        ...paramsBase,
        valor: 4,
      });

      expect(resultado).toEqual([]);
      expect(
        mockNotificacionRepository.findAlertaAbiertaPorLoteYParametro,
      ).not.toHaveBeenCalled();
    });

    it('cuando ya existe una alerta abierta para el lote y parámetro, debe retornar arreglo vacío', async () => {
      mockNotificacionRepository.findAlertaAbiertaPorLoteYParametro.mockResolvedValue(
        { id: 1 },
      );

      const resultado = await service.generarAlertaPorUmbral(paramsBase);

      expect(resultado).toEqual([]);
      expect(mockNotificacionRepository.create).not.toHaveBeenCalled();
    });

    it('cuando el valor excede el umbral y no hay alertas abiertas, debe calcular desvío y notificar destinatarios', async () => {
      mockNotificacionRepository.findAlertaAbiertaPorLoteYParametro.mockResolvedValue(
        null,
      );
      mockConfiguracionRepository.findDestinatariosConfigByNivel.mockResolvedValue(
        {
          rolIds: [2],
          usuarioIds: [5],
        },
      );

      const queryBuilderMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 10, idRol: 2 }]),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilderMock);

      mockUserRepository.find.mockResolvedValue([{ id: 5 }]);

      mockNotificacionRepository.create.mockImplementation((entity) =>
        Promise.resolve({ id: 1, ...entity }),
      );

      const resultado = await service.generarAlertaPorUmbral(paramsBase);

      expect(resultado.length).toBe(2);
      expect(mockGateway.emitirNotificacion).toHaveBeenCalledTimes(2);
    });

    it('debe deduplicar el destinatario si está asignado por rol e individualmente (HU-29)', async () => {
      mockNotificacionRepository.findAlertaAbiertaPorLoteYParametro.mockResolvedValue(
        null,
      );
      mockConfiguracionRepository.findDestinatariosConfigByNivel.mockResolvedValue(
        {
          rolIds: [2],
          usuarioIds: [10],
        },
      );

      const usuarioDuplicado = { id: 10 } as User;

      const queryBuilderMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([usuarioDuplicado]),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilderMock);
      mockUserRepository.find.mockResolvedValue([usuarioDuplicado]);

      mockNotificacionRepository.create.mockImplementation((entity) =>
        Promise.resolve({ id: 1, ...entity }),
      );

      const resultado = await service.generarAlertaPorUmbral(paramsBase);

      expect(resultado.length).toBe(1);
      expect(mockNotificacionRepository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('listarPorUsuario y contarNoLeidas', () => {
    it('listarPorUsuario: debe retornar listado paginado', async () => {
      mockNotificacionRepository.findByUsuario.mockResolvedValue([[], 0]);

      const resultado = await service.listarPorUsuario(1, 1, { page: 1 });

      expect(mockNotificacionRepository.findByUsuario).toHaveBeenCalledWith(
        1,
        1,
        { page: 1 },
      );
      expect(resultado).toHaveProperty('data');
    });

    it('contarNoLeidas: debe retornar el total formateado', async () => {
      mockNotificacionRepository.countNoLeidas.mockResolvedValue(5);

      const resultado = await service.contarNoLeidas(1, 1);

      expect(resultado).toEqual({ total: 5 });
    });
  });

  describe('marcarLeida', () => {
    it('cuando existe la notificación, debe marcarla como leída y retornar respuesta', async () => {
      const notif = { id: 1, leida: true };
      mockNotificacionRepository.markAsLeida.mockResolvedValue(notif);

      const resultado = await service.marcarLeida(1, 10, 1);

      expect(resultado).toBeDefined();
    });

    it('cuando no existe la notificación, debe lanzar NotFoundException', async () => {
      mockNotificacionRepository.markAsLeida.mockResolvedValue(null);

      await expect(service.marcarLeida(99, 10, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('crearConfiguracion', () => {
    it('debe lanzar BadRequestException si no se envía rolId ni usuarioId, o si se envían ambos', async () => {
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        service.crearConfiguracion(1, {
          nivelAlerta: NivelAlerta.CRITICA,
        } as any),
      ).rejects.toThrow(BadRequestException);

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        service.crearConfiguracion(1, {
          nivelAlerta: NivelAlerta.CRITICA,
          rolId: 1,
          usuarioId: 2,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si el usuario asignado no pertenece a la empresa o no existe', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        service.crearConfiguracion(1, {
          nivelAlerta: NivelAlerta.CRITICA,
          usuarioId: 99,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe crear la configuración correctamente cuando los datos son válidos', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 5 });
      mockConfiguracionRepository.create.mockResolvedValue({
        id: 1,
        empresaId: 1,
        usuarioId: 5,
        nivelAlerta: NivelAlerta.CRITICA,
      });

      const resultado = await service.crearConfiguracion(1, {
        nivelAlerta: NivelAlerta.CRITICA,
        usuarioId: 5,
      });

      expect(resultado).toBeDefined();
      expect(mockConfiguracionRepository.create).toHaveBeenCalledWith({
        empresaId: 1,
        nivelAlerta: NivelAlerta.CRITICA,
        rolId: null,
        usuarioId: 5,
      });
    });
  });

  describe('eliminarConfiguracion', () => {
    it('debe lanzar NotFoundException si la configuración no existe', async () => {
      mockConfiguracionRepository.findById.mockResolvedValue(null);

      await expect(service.eliminarConfiguracion(99, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar BadRequestException si intenta eliminar el último destinatario de nivel CRITICA (HU-29)', async () => {
      mockConfiguracionRepository.findById.mockResolvedValue({
        id: 1,
        nivelAlerta: NivelAlerta.CRITICA,
      });
      mockConfiguracionRepository.countByNivel.mockResolvedValue(1);

      await expect(service.eliminarConfiguracion(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe eliminar la configuración cuando no rompe las reglas de negocio', async () => {
      mockConfiguracionRepository.findById.mockResolvedValue({
        id: 1,
        nivelAlerta: NivelAlerta.ADVERTENCIA,
      });
      mockConfiguracionRepository.delete.mockResolvedValue(true);

      await service.eliminarConfiguracion(1, 1);

      expect(mockConfiguracionRepository.delete).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('resolverAlerta', () => {
    it('debe lanzar NotFoundException si la alerta no existe', async () => {
      mockNotificacionRepository.findById.mockResolvedValue(null);

      await expect(
        service.resolverAlerta(1, 1, 10, { accionCorrectiva: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si el tipo de notificación no es ALERTA_UMBRAL', async () => {
      mockNotificacionRepository.findById.mockResolvedValue({
        id: 1,
        tipo: 'NUEVA_NOTIFICACION' as TipoNotificacion,
      });

      await expect(
        service.resolverAlerta(1, 1, 10, { accionCorrectiva: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si la alerta ya está cerrada', async () => {
      mockNotificacionRepository.findById.mockResolvedValue({
        id: 1,
        tipo: TipoNotificacion.ALERTA_UMBRAL,
        estado: EstadoAlerta.CERRADA,
      });

      await expect(
        service.resolverAlerta(1, 1, 10, { accionCorrectiva: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe resolver la alerta si cumple todas las validaciones', async () => {
      mockNotificacionRepository.findById.mockResolvedValue({
        id: 1,
        tipo: TipoNotificacion.ALERTA_UMBRAL,
        estado: EstadoAlerta.ABIERTA,
      });
      mockNotificacionRepository.resolver.mockResolvedValue({
        id: 1,
        estado: EstadoAlerta.CERRADA,
      });

      const resultado = await service.resolverAlerta(1, 1, 10, {
        accionCorrectiva: 'Corrección aplicada',
      });

      expect(mockNotificacionRepository.resolver).toHaveBeenCalledWith(
        1,
        1,
        'Corrección aplicada',
        10,
      );
      expect(resultado).toBeDefined();
    });
  });

  describe('Exportaciones CSV / PDF e Historial', () => {
    it('exportarHistorialCsv: debe generar un Buffer UTF-8 con BOM', async () => {
      mockNotificacionRepository.findHistorialCompleto.mockResolvedValue([
        {
          createdAt: new Date(),
          lote: { codigo: 'L01' },
          parametro: Parametro.PH,
          nivelAlerta: NivelAlerta.CRITICA,
          estado: EstadoAlerta.ABIERTA,
          accionCorrectiva: 'Ninguna',
        },
      ]);

      const buffer = await service.exportarHistorialCsv(1, {});

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString('utf8')).toContain('"Fecha";"Lote";"Parámetro"');
    });

    it('exportarHistorialPdf: debe generar un Buffer válido con PDFDocument', async () => {
      mockNotificacionRepository.findHistorialCompleto.mockResolvedValue([]);

      const buffer = await service.exportarHistorialPdf(1, {});

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('HU-31: Alertas de Sensor Desconectado', () => {
    it('generarAlertaSensorDesconectado: no debe generar alerta si ya existe una abierta', async () => {
      mockNotificacionRepository.findAlertaAbiertaPorSensor.mockResolvedValue({
        id: 1,
      });

      const resultado = await service.generarAlertaSensorDesconectado({
        empresaId: 1,
        sensorId: 5,
        sensorNombre: 'Sensor 5',
        ultimaLectura: null,
        minutosSinDatos: 20,
      });

      expect(resultado).toEqual([]);
      expect(mockNotificacionRepository.create).not.toHaveBeenCalled();
    });

    it('generarAlertaSensorDesconectado: debe notificar a los responsables de nivel CRITICA', async () => {
      mockNotificacionRepository.findAlertaAbiertaPorSensor.mockResolvedValue(
        null,
      );
      mockConfiguracionRepository.findDestinatariosConfigByNivel.mockResolvedValue(
        {
          rolIds: [1],
          usuarioIds: [],
        },
      );

      const queryBuilderMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 10 } as User]),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilderMock);

      mockNotificacionRepository.create.mockImplementation((entity) =>
        Promise.resolve({ id: 1, ...entity }),
      );

      const resultado = await service.generarAlertaSensorDesconectado({
        empresaId: 1,
        sensorId: 5,
        sensorNombre: 'Sensor 5',
        ultimaLectura: new Date(),
        minutosSinDatos: 20,
      });

      expect(resultado.length).toBe(1);
      expect(mockGateway.emitirNotificacion).toHaveBeenCalled();
    });

    it('resolverAlertaSensorDesconectado: debe llamar a cerrar las alertas abiertas del sensor', async () => {
      await service.resolverAlertaSensorDesconectado(5, 1);

      expect(
        mockNotificacionRepository.cerrarAlertasAbiertasPorSensor,
      ).toHaveBeenCalledWith(1, 5, TipoNotificacion.ALERTA_SENSOR_DESCONECTADO);
    });
  });
});
