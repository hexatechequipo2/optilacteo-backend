import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LecturaSensorService } from '../lectura-sensor.service';
import { SENSOR_REPOSITORY } from '../../sensor/repository/sensor.repository.interface';
import { SENSOR_LOTE_HISTORIAL_REPOSITORY } from '../../sensor/repository/sensor-lote-historial.repository.interface';
import { LOTE_REPOSITORY } from '../../lote/repository/lote-repository.interface';
import { SENSOR_LECTURA_REPOSITORY } from '../repository/sensor-lectura.repository.interface';
import { SENSOR_EVENTO_REPOSITORY } from '../repository/sensor-evento.repository.interface';
import { LecturasGateway } from '../gateway/lecturas.gateway';
import { ClasificacionLoteService } from '../../lote/clasificacion-lote.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { NotificacionesService } from '../../notificaciones/notificaciones.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { LecturaMapper } from '../mappers/lectura.mapper';
import { TipoEvento } from '../enums/tipo-evento.enum';
import { OrigenLectura } from '../enums/origen-lectura.enum';
import { EstadoSensor } from '../../sensor/enums/estado-sensor.enum';
import { EstadoMedicion } from '../enums/estado-medicion.enum';
import { ROLES } from '../../rol/constants/roles.constants';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */

// El mapper se mockea: al Service solo le interesa que lo invoque bien,
// no la lógica interna de conversión (eso se testea en lectura.mapper.spec.ts).
jest.mock('../mappers/lectura.mapper', () => ({
  LecturaMapper: {
    toEntity: jest.fn(),
    toResponseDto: jest.fn(),
    toHistorialItemDto: jest.fn(),
  },
}));

// Rango físico fijo y controlado para no depender de los valores reales
// del negocio: alcanza con un único parámetro para probar la cascada.
jest.mock('../../config-parametro/validators/rangos-fisicos.constant', () => ({
  RANGOS_FISICOS: {
    PH: { min: 0, max: 14 },
  },
}));

const mockSensorRepository = {
  findByNombre: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
};
const mockHistorialRepository = { findUltimoPorSensor: jest.fn() };
const mockLoteRepository = { findByCodigo: jest.fn(), findById: jest.fn() };
const mockLecturaRepository = {
  create: jest.fn(),
  findHistorial: jest.fn(),
  findHistorialCompleto: jest.fn(),
};
const mockEventoRepository = { create: jest.fn() };
const mockLecturasGateway = {
  emitirSensorFalla: jest.fn(),
  emitirSensorRecuperado: jest.fn(),
  emitirLectura: jest.fn(),
};
const mockConfigParametroRepository = { find: jest.fn() };
const mockClasificacionLoteService = { evaluarYClasificar: jest.fn() };
const mockAuditLogService = { getTrazabilidadBatch: jest.fn() };
const mockNotificacionesService = {
  resolverAlertaSensorDesconectado: jest.fn(),
  generarAlertaPorUmbral: jest.fn(),
};

function buildSensor(overrides: Partial<any> = {}) {
  return {
    id: 1,
    nombre: 'sensor-ph-1',
    parametro: 'PH',
    estado: EstadoSensor.ACTIVO,
    ultimaLectura: null,
    ...overrides,
  };
}

function buildLote(overrides: Partial<any> = {}) {
  return { id: 10, codigo: 'L1', materiaPrima: 'LECHE_CRUDA', ...overrides };
}

describe('LecturaSensorService', () => {
  let service: LecturaSensorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LecturaSensorService,
        { provide: SENSOR_REPOSITORY, useValue: mockSensorRepository },
        {
          provide: SENSOR_LOTE_HISTORIAL_REPOSITORY,
          useValue: mockHistorialRepository,
        },
        { provide: LOTE_REPOSITORY, useValue: mockLoteRepository },
        { provide: SENSOR_LECTURA_REPOSITORY, useValue: mockLecturaRepository },
        { provide: SENSOR_EVENTO_REPOSITORY, useValue: mockEventoRepository },
        { provide: LecturasGateway, useValue: mockLecturasGateway },
        {
          provide: getRepositoryToken(ConfiguracionParametro),
          useValue: mockConfigParametroRepository,
        },
        {
          provide: ClasificacionLoteService,
          useValue: mockClasificacionLoteService,
        },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: NotificacionesService, useValue: mockNotificacionesService },
      ],
    }).compile();

    service = module.get<LecturaSensorService>(LecturaSensorService);

    // evaluarYClasificar es best-effort (fire-and-forget con .catch): que
    // resuelva por defecto evita ruido de promesas no manejadas en los tests
    // que no la testean explícitamente.
    mockClasificacionLoteService.evaluarYClasificar.mockResolvedValue(
      undefined,
    );
    mockAuditLogService.getTrazabilidadBatch.mockResolvedValue(new Map());

    // construirMapaUmbrales itera el resultado de find(): sin este default
    // devuelve undefined y el for...of del service explota en los tests que
    // no lo mockean explícitamente.
    mockConfigParametroRepository.find.mockResolvedValue([]);

    // resolverAlertaSensorDesconectado y generarAlertaPorUmbral también son
    // best-effort (fire-and-forget con .catch): mismo motivo que arriba.
    mockNotificacionesService.resolverAlertaSensorDesconectado.mockResolvedValue(
      undefined,
    );
    mockNotificacionesService.generarAlertaPorUmbral.mockResolvedValue(
      undefined,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('ingresar', () => {
    const dto = {
      sensor_id: 'sensor-ph-1',
      lote_id: 'L1',
      valor: 7,
      timestamp: '2026-01-01T10:00:00.000Z',
    } as any;
    const tenant = { empresaId: 99 } as any;

    it('cuando el usuario no tiene empresa asociada, debe lanzar BadRequestException', async () => {
      await expect(
        service.ingresar(dto, { empresaId: null } as any),
      ).rejects.toThrow(BadRequestException);
      expect(mockSensorRepository.findByNombre).not.toHaveBeenCalled();
    });

    it('cuando el sensor no existe, debe registrar el evento SENSOR_NO_ENCONTRADO y lanzar NotFoundException', async () => {
      mockSensorRepository.findByNombre.mockResolvedValue(null);

      await expect(service.ingresar(dto, tenant)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockEventoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoEvento: TipoEvento.SENSOR_NO_ENCONTRADO,
          empresaId: 99,
          sensorIdRecibido: dto.sensor_id,
          loteIdRecibido: dto.lote_id,
        }),
      );
    });

    it('cuando el lote no existe, debe registrar el evento LOTE_NO_ENCONTRADO y lanzar NotFoundException', async () => {
      const sensor = buildSensor();
      mockSensorRepository.findByNombre.mockResolvedValue(sensor);
      mockLoteRepository.findByCodigo.mockResolvedValue(null);

      await expect(service.ingresar(dto, tenant)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockEventoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoEvento: TipoEvento.LOTE_NO_ENCONTRADO,
          sensorId: sensor.id,
          loteIdRecibido: dto.lote_id,
        }),
      );
    });

    it('cuando el sensor no está asociado al lote recibido, debe registrar SENSOR_NO_ASOCIADO_A_LOTE y lanzar NotFoundException', async () => {
      const sensor = buildSensor();
      const lote = buildLote();
      mockSensorRepository.findByNombre.mockResolvedValue(sensor);
      mockLoteRepository.findByCodigo.mockResolvedValue(lote);
      mockHistorialRepository.findUltimoPorSensor.mockResolvedValue({
        loteIdNuevo: 999,
      });

      await expect(service.ingresar(dto, tenant)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockEventoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoEvento: TipoEvento.SENSOR_NO_ASOCIADO_A_LOTE,
          sensorId: sensor.id,
          loteId: lote.id,
        }),
      );
      expect(mockLecturaRepository.create).not.toHaveBeenCalled();
    });

    it('cuando el sensor nunca tuvo una asociación registrada, también debe lanzar NotFoundException', async () => {
      const sensor = buildSensor();
      const lote = buildLote();
      mockSensorRepository.findByNombre.mockResolvedValue(sensor);
      mockLoteRepository.findByCodigo.mockResolvedValue(lote);
      mockHistorialRepository.findUltimoPorSensor.mockResolvedValue(null);

      await expect(service.ingresar(dto, tenant)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('cuando el valor está fuera del rango físico posible, debe pasar el sensor a FALLA, emitir el evento y lanzar UnprocessableEntityException', async () => {
      // Arrange: PH fuera del rango [0, 14]
      const sensor = buildSensor({ estado: EstadoSensor.ACTIVO });
      const lote = buildLote();
      const dtoFueraDeRango = { ...dto, valor: 20 };
      mockSensorRepository.findByNombre.mockResolvedValue(sensor);
      mockLoteRepository.findByCodigo.mockResolvedValue(lote);
      mockHistorialRepository.findUltimoPorSensor.mockResolvedValue({
        loteIdNuevo: lote.id,
      });

      await expect(service.ingresar(dtoFueraDeRango, tenant)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(sensor.estado).toBe(EstadoSensor.FALLA);
      expect(mockSensorRepository.save).toHaveBeenCalledWith(sensor);
      expect(mockLecturasGateway.emitirSensorFalla).toHaveBeenCalledWith(
        { sensorId: sensor.id, nombre: sensor.nombre },
        99,
      );
      expect(mockEventoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoEvento: TipoEvento.VALOR_FUERA_DE_RANGO,
          valorRecibido: 20,
        }),
      );
      // El valor rechazado no debe persistirse como lectura
      expect(mockLecturaRepository.create).not.toHaveBeenCalled();
    });

    it('cuando el sensor ya estaba ACTIVO, debe persistir la lectura sin emitir evento de recuperación', async () => {
      const sensor = buildSensor({ estado: EstadoSensor.ACTIVO });
      const lote = buildLote();
      const lecturaEntity = { id: 0 };
      const creada = { id: 555 };
      const responseDto = { id: 555, valor: 7 };
      mockSensorRepository.findByNombre.mockResolvedValue(sensor);
      mockLoteRepository.findByCodigo.mockResolvedValue(lote);
      mockHistorialRepository.findUltimoPorSensor.mockResolvedValue({
        loteIdNuevo: lote.id,
      });
      (LecturaMapper.toEntity as jest.Mock).mockReturnValue(lecturaEntity);
      mockLecturaRepository.create.mockResolvedValue(creada);
      (LecturaMapper.toResponseDto as jest.Mock).mockReturnValue(responseDto);

      const resultado = await service.ingresar(dto, tenant);

      expect(mockLecturaRepository.create).toHaveBeenCalledWith(lecturaEntity);
      expect(sensor.estado).toBe(EstadoSensor.ACTIVO);
      expect(sensor.ultimaLectura).toEqual(new Date(dto.timestamp));
      expect(mockSensorRepository.save).toHaveBeenCalledWith(sensor);
      expect(mockEventoRepository.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ tipoEvento: TipoEvento.SENSOR_RECUPERADO }),
      );
      expect(mockLecturasGateway.emitirSensorRecuperado).not.toHaveBeenCalled();
      expect(mockLecturasGateway.emitirLectura).toHaveBeenCalledWith(
        responseDto,
        99,
      );
      expect(
        mockClasificacionLoteService.evaluarYClasificar,
      ).toHaveBeenCalledWith(lote.id, 99);
      expect(resultado).toBe(responseDto);
    });

    it('cuando el sensor no estaba ACTIVO (inactivo o en falla), la lectura válida debe recuperarlo y emitir SENSOR_RECUPERADO', async () => {
      const sensor = buildSensor({ estado: EstadoSensor.INACTIVO });
      const lote = buildLote();
      mockSensorRepository.findByNombre.mockResolvedValue(sensor);
      mockLoteRepository.findByCodigo.mockResolvedValue(lote);
      mockHistorialRepository.findUltimoPorSensor.mockResolvedValue({
        loteIdNuevo: lote.id,
      });
      (LecturaMapper.toEntity as jest.Mock).mockReturnValue({});
      mockLecturaRepository.create.mockResolvedValue({ id: 1 });
      (LecturaMapper.toResponseDto as jest.Mock).mockReturnValue({ id: 1 });

      await service.ingresar(dto, tenant);

      expect(sensor.estado).toBe(EstadoSensor.ACTIVO);
      expect(mockEventoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoEvento: TipoEvento.SENSOR_RECUPERADO,
          sensorId: sensor.id,
        }),
      );
      expect(mockLecturasGateway.emitirSensorRecuperado).toHaveBeenCalledWith(
        { sensorId: sensor.id, nombre: sensor.nombre },
        99,
      );
    });

    it('cuando la clasificación automática del lote falla, no debe romper la ingesta de la lectura (best-effort)', async () => {
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      const sensor = buildSensor();
      const lote = buildLote();
      mockSensorRepository.findByNombre.mockResolvedValue(sensor);
      mockLoteRepository.findByCodigo.mockResolvedValue(lote);
      mockHistorialRepository.findUltimoPorSensor.mockResolvedValue({
        loteIdNuevo: lote.id,
      });
      (LecturaMapper.toEntity as jest.Mock).mockReturnValue({});
      mockLecturaRepository.create.mockResolvedValue({ id: 1 });
      (LecturaMapper.toResponseDto as jest.Mock).mockReturnValue({ id: 1 });
      mockClasificacionLoteService.evaluarYClasificar.mockRejectedValue(
        new Error('falló'),
      );

      const resultado = await service.ingresar(dto, tenant);

      // Assert: la ingesta se completó igual
      expect(resultado).toEqual({ id: 1 });
      // Se le da chance al .catch() de ejecutarse antes de verificar el log
      await new Promise(process.nextTick);
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });

  describe('ingresarManual', () => {
    const dto = { sensorId: 1, valor: 7 } as any;
    const usuarioId = 42;
    const tenant = { empresaId: 99 } as any;

    it('cuando el sensor no existe, debe lanzar NotFoundException', async () => {
      mockSensorRepository.findOne.mockResolvedValue(null);

      await expect(
        service.ingresarManual(dto, usuarioId, tenant),
      ).rejects.toThrow(NotFoundException);
    });

    it('cuando el sensor está ACTIVO, debe lanzar BadRequestException porque no se permite carga manual', async () => {
      mockSensorRepository.findOne.mockResolvedValue(
        buildSensor({ estado: EstadoSensor.ACTIVO }),
      );

      await expect(
        service.ingresarManual(dto, usuarioId, tenant),
      ).rejects.toThrow(BadRequestException);
    });

    it('cuando el sensor no tiene ningún lote asociado, debe lanzar NotFoundException', async () => {
      mockSensorRepository.findOne.mockResolvedValue(
        buildSensor({ estado: EstadoSensor.FALLA }),
      );
      mockHistorialRepository.findUltimoPorSensor.mockResolvedValue(null);

      await expect(
        service.ingresarManual(dto, usuarioId, tenant),
      ).rejects.toThrow(NotFoundException);
    });

    it('cuando el valor está fuera del rango físico posible, debe lanzar UnprocessableEntityException', async () => {
      mockSensorRepository.findOne.mockResolvedValue(
        buildSensor({ estado: EstadoSensor.FALLA }),
      );
      mockHistorialRepository.findUltimoPorSensor.mockResolvedValue({
        loteIdNuevo: 10,
      });
      mockLoteRepository.findById.mockResolvedValue(buildLote({ id: 10 }));

      await expect(
        service.ingresarManual({ ...dto, valor: 20 }, usuarioId, tenant),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(mockLecturaRepository.create).not.toHaveBeenCalled();
    });

    it('cuando los datos son válidos, debe crear la lectura con origen MANUAL, emitirla y no tocar el estado del sensor', async () => {
      const sensor = buildSensor({ estado: EstadoSensor.INACTIVO });
      const lote = buildLote({ id: 10 });
      const lecturaEntity = {};
      const creada = { id: 7 };
      const responseDto = { id: 7, valor: 7 };
      mockSensorRepository.findOne.mockResolvedValue(sensor);
      mockHistorialRepository.findUltimoPorSensor.mockResolvedValue({
        loteIdNuevo: 10,
      });
      mockLoteRepository.findById.mockResolvedValue(lote);
      (LecturaMapper.toEntity as jest.Mock).mockReturnValue(lecturaEntity);
      mockLecturaRepository.create.mockResolvedValue(creada);
      (LecturaMapper.toResponseDto as jest.Mock).mockReturnValue(responseDto);

      const resultado = await service.ingresarManual(dto, usuarioId, tenant);

      expect(LecturaMapper.toEntity).toHaveBeenCalledWith(
        sensor.id,
        10,
        dto.valor,
        expect.any(Date),
        99,
        OrigenLectura.MANUAL,
        usuarioId,
      );
      expect(mockLecturaRepository.create).toHaveBeenCalledWith(lecturaEntity);
      expect(mockLecturasGateway.emitirLectura).toHaveBeenCalledWith(
        responseDto,
        99,
      );
      expect(
        mockClasificacionLoteService.evaluarYClasificar,
      ).toHaveBeenCalledWith(10, 99);
      // El estado del sensor y su última lectura no se modifican en la carga manual
      expect(mockSensorRepository.save).not.toHaveBeenCalled();
      expect(sensor.estado).toBe(EstadoSensor.INACTIVO);
      expect(resultado).toBe(responseDto);
    });
  });

  describe('consultarHistorial', () => {
    const tenant = { empresaId: 99 } as any;

    it('cuando el usuario no tiene empresa asociada, debe lanzar BadRequestException', async () => {
      await expect(
        service.consultarHistorial({} as any, { empresaId: null } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('cuando fechaFin es anterior a fechaInicio, debe lanzar BadRequestException', async () => {
      const query = {
        fechaInicio: '2026-02-10',
        fechaFin: '2026-02-01',
      } as any;

      await expect(service.consultarHistorial(query, tenant)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cuando se filtra por un loteCodigo que no existe, debe devolver una página vacía sin consultar lecturas', async () => {
      mockLoteRepository.findByCodigo.mockResolvedValue(null);

      const resultado = await service.consultarHistorial(
        { loteCodigo: 'NOEXISTE' },
        tenant,
      );

      expect(resultado).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        rangoAmplio: false,
      });
      expect(mockLecturaRepository.findHistorial).not.toHaveBeenCalled();
    });

    it('cuando no se especifican page ni limit, debe usar los valores por defecto (page=1, limit=20)', async () => {
      mockLecturaRepository.findHistorial.mockResolvedValue([[], 0]);
      mockConfigParametroRepository.find.mockResolvedValue([]);

      await service.consultarHistorial({}, tenant);

      expect(mockLecturaRepository.findHistorial).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20 }),
        99,
      );
    });

    it('cuando no hay umbral configurado para el parámetro y materia prima de la lectura, debe marcarla como SIN_UMBRAL_CONFIGURADO', async () => {
      const lectura = {
        valor: 7,
        sensor: { parametro: 'PH' },
        lote: { materiaPrima: 'LECHE_CRUDA' },
      };
      mockLecturaRepository.findHistorial.mockResolvedValue([[lectura], 1]);
      mockConfigParametroRepository.find.mockResolvedValue([]); // sin configuraciones

      await service.consultarHistorial({}, tenant);

      expect(LecturaMapper.toHistorialItemDto).toHaveBeenCalledWith(
        lectura,
        EstadoMedicion.SIN_UMBRAL_CONFIGURADO,
      );
    });

    it('cuando el valor está fuera del umbral configurado por la empresa, debe marcarla como FUERA_DE_RANGO', async () => {
      const lectura = {
        valor: 20,
        sensor: { parametro: 'PH' },
        lote: { materiaPrima: 'LECHE_CRUDA' },
      };
      mockLecturaRepository.findHistorial.mockResolvedValue([[lectura], 1]);
      mockConfigParametroRepository.find.mockResolvedValue([
        {
          parametro: 'PH',
          tipoMateriaPrima: 'LECHE_CRUDA',
          umbralMin: 0,
          umbralMax: 14,
        },
      ]);

      await service.consultarHistorial({}, tenant);

      expect(LecturaMapper.toHistorialItemDto).toHaveBeenCalledWith(
        lectura,
        EstadoMedicion.FUERA_DE_RANGO,
      );
    });

    it('cuando el valor está dentro del umbral configurado, debe marcarla como NORMAL', async () => {
      const lectura = {
        valor: 7,
        sensor: { parametro: 'PH' },
        lote: { materiaPrima: 'LECHE_CRUDA' },
      };
      mockLecturaRepository.findHistorial.mockResolvedValue([[lectura], 1]);
      mockConfigParametroRepository.find.mockResolvedValue([
        {
          parametro: 'PH',
          tipoMateriaPrima: 'LECHE_CRUDA',
          umbralMin: 0,
          umbralMax: 14,
        },
      ]);

      await service.consultarHistorial({}, tenant);

      expect(LecturaMapper.toHistorialItemDto).toHaveBeenCalledWith(
        lectura,
        EstadoMedicion.NORMAL,
      );
    });

    it('cuando el rango de fechas consultado supera los 30 días, debe marcar rangoAmplio en true', async () => {
      mockLecturaRepository.findHistorial.mockResolvedValue([[], 0]);
      mockConfigParametroRepository.find.mockResolvedValue([]);
      const query = {
        fechaInicio: '2026-01-01',
        fechaFin: '2026-03-01',
      } as any;

      const resultado = await service.consultarHistorial(query, tenant);

      expect(resultado.rangoAmplio).toBe(true);
    });

    it('cuando el rango de fechas consultado es de 30 días o menos, debe marcar rangoAmplio en false', async () => {
      mockLecturaRepository.findHistorial.mockResolvedValue([[], 0]);
      mockConfigParametroRepository.find.mockResolvedValue([]);
      const query = {
        fechaInicio: '2026-01-01',
        fechaFin: '2026-01-15',
      } as any;

      const resultado = await service.consultarHistorial(query, tenant);

      expect(resultado.rangoAmplio).toBe(false);
    });

    it('cuando el usuario es GERENTE, debe consultar la trazabilidad de auditoría de las lecturas', async () => {
      const lectura = {
        id: 123,
        valor: 7,
        sensor: { parametro: 'PH' },
        lote: { materiaPrima: 'LECHE_CRUDA' },
      };

      mockLecturaRepository.findHistorial.mockResolvedValue([[lectura], 1]);
      mockConfigParametroRepository.find.mockResolvedValue([]);
      mockAuditLogService.getTrazabilidadBatch.mockResolvedValue(
        new Map([[123, { creadoPor: 'usuario-test' }]]),
      );

      (LecturaMapper.toHistorialItemDto as jest.Mock).mockReturnValue({
        id: 123,
        valor: 7,
      });

      const resultado = await service.consultarHistorial(
        {},
        {
          empresaId: 99,
          rolNombre: ROLES.GERENTE,
        },
      );

      expect(mockAuditLogService.getTrazabilidadBatch).toHaveBeenCalledWith(
        'SensorLectura',
        [123],
        99,
      );

      expect(resultado.data[0].auditoria).toEqual({
        creadoPor: 'usuario-test',
      });
    });

    it('cuando el usuario no es GERENTE, no debe consultar la trazabilidad de auditoría', async () => {
      const lectura = {
        id: 123,
        valor: 7,
        sensor: { parametro: 'PH' },
        lote: { materiaPrima: 'LECHE_CRUDA' },
      };

      mockLecturaRepository.findHistorial.mockResolvedValue([[lectura], 1]);
      mockConfigParametroRepository.find.mockResolvedValue([]);
      (LecturaMapper.toHistorialItemDto as jest.Mock).mockReturnValue({
        id: 123,
        valor: 7,
      });

      await service.consultarHistorial({}, {
        empresaId: 99,
        rolNombre: 'RESPONSABLE_DE_CALIDAD',
      } as any);

      expect(mockAuditLogService.getTrazabilidadBatch).not.toHaveBeenCalled();
    });
  });

  describe('exportarHistorial', () => {
    const tenant = { empresaId: 99 } as any;

    it('cuando el usuario no tiene empresa asociada, debe lanzar BadRequestException', async () => {
      await expect(
        service.exportarHistorial({} as any, { empresaId: null } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('cuando fechaFin es anterior a fechaInicio, debe lanzar BadRequestException', async () => {
      const query = {
        fechaInicio: '2026-02-10',
        fechaFin: '2026-02-01',
      } as any;

      await expect(service.exportarHistorial(query, tenant)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cuando se filtra por un loteCodigo que no existe, debe devolver un CSV con solo los encabezados', async () => {
      mockLoteRepository.findByCodigo.mockResolvedValue(null);

      const resultado = await service.exportarHistorial(
        { loteCodigo: 'NOEXISTE' },
        tenant,
      );

      expect(resultado).toBe(
        'id,valor,unidad,sensor,parametro,lote,fechaHora,estado',
      );
      expect(
        mockLecturaRepository.findHistorialCompleto,
      ).not.toHaveBeenCalled();
    });

    it('debe exportar todas las lecturas sin paginar, con las columnas y el formato CSV esperados', async () => {
      const lectura = {
        valor: 7,
        sensor: { parametro: 'PH' },
        lote: { materiaPrima: 'LECHE_CRUDA' },
      };
      mockLecturaRepository.findHistorialCompleto.mockResolvedValue([lectura]);
      mockConfigParametroRepository.find.mockResolvedValue([]);
      (LecturaMapper.toHistorialItemDto as jest.Mock).mockReturnValue({
        id: 1,
        valor: 7,
        unidad: 'pH',
        sensorNombre: 'sensor-ph-1',
        parametro: 'PH',
        loteCodigo: 'L1',
        timestampLectura: new Date('2026-01-01T10:00:00.000Z'),
        estado: EstadoMedicion.SIN_UMBRAL_CONFIGURADO,
      });

      const resultado = await service.exportarHistorial({}, tenant);

      expect(mockLecturaRepository.findHistorialCompleto).toHaveBeenCalledWith(
        expect.objectContaining({ loteId: undefined }),
        99,
      );
      const filas = resultado.split('\n');
      expect(filas[0]).toBe(
        'id,valor,unidad,sensor,parametro,lote,fechaHora,estado',
      );
      expect(filas[1]).toBe(
        '"1","7","pH","sensor-ph-1","PH","L1","2026-01-01T10:00:00.000Z","SIN_UMBRAL_CONFIGURADO"',
      );
    });

    it('cuando un valor del CSV contiene comillas dobles, debe escaparlas duplicándolas', async () => {
      mockLecturaRepository.findHistorialCompleto.mockResolvedValue([
        {
          valor: 7,
          sensor: {
            parametro: 'PH',
          },
          lote: {
            materiaPrima: 'LECHE_CRUDA',
          },
        },
      ]);

      mockConfigParametroRepository.find.mockResolvedValue([]);
      (LecturaMapper.toHistorialItemDto as jest.Mock).mockReturnValue({
        id: 1,
        valor: 7,
        unidad: 'pH',
        sensorNombre: 'sensor "principal"',
        parametro: 'PH',
        loteCodigo: 'L1',
        timestampLectura: new Date('2026-01-01T10:00:00.000Z'),
        estado: EstadoMedicion.NORMAL,
      });

      const resultado = await service.exportarHistorial({}, tenant);

      expect(resultado).toContain('"sensor ""principal"""');
    });
  });
});
