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
import { CONFIGURACION_SILENCIO_REPOSITORY } from '../repository/configuracion-silencio-alerta.repository.interface';
import { HttpMlClient } from '../../ml/infrastructure/http-ml-client';

describe('NotificacionesService', () => {
  let service: NotificacionesService;

  let mockNotificacionRepository: {
    create: jest.Mock;
    findByUsuario: jest.Mock;
    markAsLeida: jest.Mock;
    countNoLeidas: jest.Mock;
    findAlertaAbiertaPorLoteYParametro: jest.Mock;
    findAlertaAbiertaAnomalia: jest.Mock;
    findAlertaAbiertaPorSensor: jest.Mock;
    cerrarAlertasAbiertasPorSensor: jest.Mock;
    findById: jest.Mock;
    resolver: jest.Mock;
    marcarFalsoPositivo: jest.Mock;
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

  let mockConfiguracionSilencioRepository: {
    findByEmpresa: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  let mockHttpMlClient: {
    detectarAnomalia: jest.Mock;
  };

  beforeEach(async () => {
    mockNotificacionRepository = {
      create: jest.fn(),
      findByUsuario: jest.fn(),
      markAsLeida: jest.fn(),
      countNoLeidas: jest.fn(),
      findAlertaAbiertaPorLoteYParametro: jest.fn(),
      findAlertaAbiertaAnomalia: jest.fn(),
      findAlertaAbiertaPorSensor: jest.fn(),
      cerrarAlertasAbiertasPorSensor: jest.fn(),
      findById: jest.fn(),
      resolver: jest.fn(),
      marcarFalsoPositivo: jest.fn(),
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

    mockConfiguracionSilencioRepository = {
      findByEmpresa: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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

    mockHttpMlClient = {
      detectarAnomalia: jest.fn(),
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
          provide: CONFIGURACION_SILENCIO_REPOSITORY,
          useValue: mockConfiguracionSilencioRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: NotificacionesGateway,
          useValue: mockGateway,
        },
        {
          provide: HttpMlClient,
          useValue: mockHttpMlClient,
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
        TipoNotificacion.ALERTA_UMBRAL,
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
      materiaPrima: TipoMateriaPrima.LECHE_CRUDA,
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
      mockConfiguracionSilencioRepository.findByEmpresa.mockResolvedValue([]);

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
      mockConfiguracionSilencioRepository.findByEmpresa.mockResolvedValue([]);

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

    it('debe persistir la alerta pero NO emitir por Gateway si está en horario de silencio (HU-30)', async () => {
      const paramsInformativa = {
        ...paramsBase,
        valor: 6.2, // Genera desvío <= 5% -> Nivel INFORMATIVA
      };

      mockNotificacionRepository.findAlertaAbiertaPorLoteYParametro.mockResolvedValue(
        null,
      );
      mockConfiguracionRepository.findDestinatariosConfigByNivel.mockResolvedValue(
        {
          rolIds: [],
          usuarioIds: [10],
        },
      );
      mockUserRepository.find.mockResolvedValue([{ id: 10 } as User]);

      mockConfiguracionSilencioRepository.findByEmpresa.mockResolvedValue([
        { horaInicio: '00:00', horaFin: '23:59', diasSemana: null },
      ]);

      mockNotificacionRepository.create.mockImplementation((entity) =>
        Promise.resolve({ id: 1, ...entity }),
      );

      const resultado = await service.generarAlertaPorUmbral(paramsInformativa);

      expect(resultado.length).toBe(1);
      expect(mockNotificacionRepository.create).toHaveBeenCalledTimes(1);
      expect(mockGateway.emitirNotificacion).not.toHaveBeenCalled();
    });
  });

  describe('HU-50: Detección de Anomalías con ML', () => {
    const paramsAnomalia = {
      empresaId: 1,
      loteId: 100,
      loteCodigo: 'L-001',
      parametro: Parametro.TEMPERATURA,
      valor: 15.5,
    };

    it('no debe generar alerta si ML responde que no es anomalía', async () => {
      mockHttpMlClient.detectarAnomalia.mockResolvedValue({
        status: 'ok',
        esAnomalia: false,
      });

      const res = await service.generarAlertaAnomalia(paramsAnomalia);

      expect(res).toEqual([]);
      expect(
        mockNotificacionRepository.findAlertaAbiertaAnomalia,
      ).not.toHaveBeenCalled();
    });

    it('no debe generar alerta si ya existe una alerta abierta de anomalía', async () => {
      mockHttpMlClient.detectarAnomalia.mockResolvedValue({
        status: 'ok',
        esAnomalia: true,
        confianza: 0.95,
      });
      mockNotificacionRepository.findAlertaAbiertaAnomalia.mockResolvedValue({
        id: 1,
      });

      const res = await service.generarAlertaAnomalia(paramsAnomalia);

      expect(res).toEqual([]);
      expect(mockNotificacionRepository.create).not.toHaveBeenCalled();
    });

    it('debe crear y notificar la alerta de anomalía si es detectada', async () => {
      mockHttpMlClient.detectarAnomalia.mockResolvedValue({
        status: 'ok',
        esAnomalia: true,
        confianza: 0.95,
      });
      mockNotificacionRepository.findAlertaAbiertaAnomalia.mockResolvedValue(null);
      mockConfiguracionRepository.findDestinatariosConfigByNivel.mockResolvedValue(
        {
          rolIds: [],
          usuarioIds: [5],
        },
      );
      mockUserRepository.find.mockResolvedValue([{ id: 5 } as User]);
      mockNotificacionRepository.create.mockImplementation((entity) =>
        Promise.resolve({ id: 10, ...entity }),
      );

      const res = await service.generarAlertaAnomalia(paramsAnomalia);

      expect(res.length).toBe(1);
      expect(mockGateway.emitirNotificacion).toHaveBeenCalledTimes(1);
    });

    it('marcarFalsoPositivo: debe cambiar el estado a FALSO_POSITIVO si está abierta', async () => {
      mockNotificacionRepository.findById.mockResolvedValue({
        id: 10,
        tipo: TipoNotificacion.ALERTA_ANOMALIA,
        estado: EstadoAlerta.ABIERTA,
      });
      mockNotificacionRepository.marcarFalsoPositivo.mockResolvedValue({
        id: 10,
        estado: EstadoAlerta.FALSO_POSITIVO,
      });

      const res = await service.marcarFalsoPositivo(10, 1, 5);

      expect(res.estado).toBe(EstadoAlerta.FALSO_POSITIVO);
      expect(mockNotificacionRepository.marcarFalsoPositivo).toHaveBeenCalledWith(
        10,
        1,
        5,
      );
    });

    it('marcarFalsoPositivo: debe lanzar BadRequestException si la alerta no es de tipo ALERTA_ANOMALIA', async () => {
      mockNotificacionRepository.findById.mockResolvedValue({
        id: 10,
        tipo: TipoNotificacion.ALERTA_UMBRAL,
        estado: EstadoAlerta.ABIERTA,
      });

      await expect(service.marcarFalsoPositivo(10, 1, 5)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('HU-30: Gestión de Horarios de Silencio (CRUD y Validaciones)', () => {
    it('listarHorariosSilencio: debe listar las configuraciones de la empresa', async () => {
      mockConfiguracionSilencioRepository.findByEmpresa.mockResolvedValue([
        { id: 1, horaInicio: '22:00', horaFin: '06:00', diasSemana: null, nombre: 'Noche' },
      ]);

      const res = await service.listarHorariosSilencio(1);

      expect(res).toHaveLength(1);
      expect(mockConfiguracionSilencioRepository.findByEmpresa).toHaveBeenCalledWith(1);
    });

    it('crearHorarioSilencio: debe lanzar BadRequestException si horaInicio es igual a horaFin', async () => {
      await expect(
        service.crearHorarioSilencio(1, {
          horaInicio: '08:00',
          horaFin: '08:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('crearHorarioSilencio: debe lanzar BadRequestException si el horario se solapa con uno existente', async () => {
      mockConfiguracionSilencioRepository.findByEmpresa.mockResolvedValue([
        { id: 1, horaInicio: '22:00', horaFin: '06:00', diasSemana: null, nombre: 'Noche' },
      ]);

      await expect(
        service.crearHorarioSilencio(1, {
          horaInicio: '05:00',
          horaFin: '09:00',
          diasSemana: [1, 2],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('crearHorarioSilencio: debe crear exitosamente si no hay solapamientos', async () => {
      mockConfiguracionSilencioRepository.findByEmpresa.mockResolvedValue([]);
      mockConfiguracionSilencioRepository.create.mockResolvedValue({
        id: 10,
        empresaId: 1,
        horaInicio: '13:00',
        horaFin: '14:00',
        diasSemana: [1, 2, 3],
        nombre: 'Almuerzo',
      });

      const res = await service.crearHorarioSilencio(1, {
        horaInicio: '13:00',
        horaFin: '14:00',
        diasSemana: [1, 2, 3],
        nombre: 'Almuerzo',
      });

      expect(res.id).toBe(10);
      expect(mockConfiguracionSilencioRepository.create).toHaveBeenCalled();
    });

    it('actualizarHorarioSilencio: debe lanzar NotFoundException si el horario no existe', async () => {
      mockConfiguracionSilencioRepository.findById.mockResolvedValue(null);

      await expect(
        service.actualizarHorarioSilencio(99, 1, { horaInicio: '10:00' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('actualizarHorarioSilencio: debe lanzar NotFoundException si update devuelve nulo', async () => {
      mockConfiguracionSilencioRepository.findById.mockResolvedValue({
        id: 1,
        horaInicio: '08:00',
        horaFin: '12:00',
      });
      mockConfiguracionSilencioRepository.findByEmpresa.mockResolvedValue([]);
      mockConfiguracionSilencioRepository.update.mockResolvedValue(null);

      await expect(
        service.actualizarHorarioSilencio(1, 1, { horaInicio: '09:00' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('actualizarHorarioSilencio: debe actualizar correctamente el horario', async () => {
      mockConfiguracionSilencioRepository.findById.mockResolvedValue({
        id: 1,
        horaInicio: '08:00',
        horaFin: '12:00',
        diasSemana: null,
      });
      mockConfiguracionSilencioRepository.findByEmpresa.mockResolvedValue([]);
      mockConfiguracionSilencioRepository.update.mockResolvedValue({
        id: 1,
        horaInicio: '09:00',
        horaFin: '12:00',
        diasSemana: null,
      });

      const res = await service.actualizarHorarioSilencio(1, 1, { horaInicio: '09:00' });

      expect(res.horaInicio).toBe('09:00');
      expect(mockConfiguracionSilencioRepository.update).toHaveBeenCalled();
    });

    it('eliminarHorarioSilencio: debe eliminar el registro exitosamente', async () => {
      mockConfiguracionSilencioRepository.delete.mockResolvedValue(true);

      await service.eliminarHorarioSilencio(1, 1);

      expect(mockConfiguracionSilencioRepository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('eliminarHorarioSilencio: debe lanzar NotFoundException si el registro a eliminar no existe', async () => {
      mockConfiguracionSilencioRepository.delete.mockResolvedValue(false);

      await expect(service.eliminarHorarioSilencio(99, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debeSilenciarse: NO debe silenciar alertas de nivel CRITICA o ADVERTENCIA aunque coincida el horario', async () => {
      const paramsCritica = {
        empresaId: 1,
        loteId: 100,
        loteCodigo: 'L-001',
        parametro: Parametro.TEMPERATURA,
        materiaPrima: TipoMateriaPrima.LECHE_CRUDA,
        valor: 20,
        umbralMin: 2,
        umbralMax: 6,
      };

      mockNotificacionRepository.findAlertaAbiertaPorLoteYParametro.mockResolvedValue(null);
      mockConfiguracionRepository.findDestinatariosConfigByNivel.mockResolvedValue({
        rolIds: [],
        usuarioIds: [10],
      });
      mockUserRepository.find.mockResolvedValue([{ id: 10 } as User]);

      mockConfiguracionSilencioRepository.findByEmpresa.mockResolvedValue([
        { horaInicio: '00:00', horaFin: '23:59', diasSemana: null },
      ]);

      mockNotificacionRepository.create.mockImplementation((entity) =>
        Promise.resolve({ id: 1, ...entity }),
      );

      await service.generarAlertaPorUmbral(paramsCritica);

      expect(mockGateway.emitirNotificacion).toHaveBeenCalledTimes(1);
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
        service.crearConfiguracion(1, {
          nivelAlerta: NivelAlerta.CRITICA,
        } as any),
      ).rejects.toThrow(BadRequestException);

      await expect(
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
      const alertaInvalida = {
        id: 1,
        tipo: TipoNotificacion.ALERTA_ANOMALIA,
        estado: EstadoAlerta.ABIERTA,
      };

      mockNotificacionRepository.findById.mockResolvedValue(alertaInvalida);
      mockNotificacionRepository.resolver.mockResolvedValue(alertaInvalida);

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