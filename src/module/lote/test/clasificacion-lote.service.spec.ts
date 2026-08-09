import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClasificacionLoteService } from '../clasificacion-lote.service';
import { Lote } from '../entities/lote.entity';
import { LoteClasificacionHistorial } from '../../lote/entities/lote-clasificacion-historial.entity';
import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { SensorLectura } from '../../lectura-sensor/entities/sensor-lectura.entity';
import { MedicionManualLote } from '../../medicion-manual/entities/medicion-manual-lote.entity';
import { Sensor } from '../../sensor/entities/sensor.entity';
import { NotificacionesService } from '../../notificaciones/notificaciones.service';
import { ClasificacionLote } from '../enums/clasificacion-lote.enum';
import { EstadoSensor } from '../../sensor/enums/estado-sensor.enum';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { TipoNotificacion } from '../../notificaciones/enums/tipo-notificacion.enum';

type MockRepository<T = any> = {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  createQueryBuilder: jest.Mock;
};

const createMockRepository = <T = any>(): MockRepository<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('ClasificacionLoteService', () => {
  let service: ClasificacionLoteService;
  let loteRepo: MockRepository<Lote>;
  let historialRepo: MockRepository<LoteClasificacionHistorial>;
  let configRepo: MockRepository<ConfiguracionParametro>;
  let sensorLecturaRepo: MockRepository<SensorLectura>;
  let medicionManualRepo: MockRepository<MedicionManualLote>;
  let sensorRepo: MockRepository<Sensor>;
  let notificacionesService: jest.Mocked<Partial<NotificacionesService>>;

  const mockQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    notificacionesService = {
      notificarResponsablesCalidad: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClasificacionLoteService,
        { provide: getRepositoryToken(Lote), useValue: createMockRepository() },
        {
          provide: getRepositoryToken(LoteClasificacionHistorial),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(ConfiguracionParametro),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(SensorLectura),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(MedicionManualLote),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Sensor),
          useValue: createMockRepository(),
        },
        { provide: NotificacionesService, useValue: notificacionesService },
      ],
    }).compile();

    service = module.get<ClasificacionLoteService>(ClasificacionLoteService);
    loteRepo = module.get(getRepositoryToken(Lote));
    historialRepo = module.get(getRepositoryToken(LoteClasificacionHistorial));
    configRepo = module.get(getRepositoryToken(ConfiguracionParametro));
    sensorLecturaRepo = module.get(getRepositoryToken(SensorLectura));
    medicionManualRepo = module.get(getRepositoryToken(MedicionManualLote));
    sensorRepo = module.get(getRepositoryToken(Sensor));

    const createQueryBuilderMock =
      sensorLecturaRepo.createQueryBuilder as jest.Mock;
    createQueryBuilderMock.mockReturnValue(mockQueryBuilder as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('evaluarYClasificar', () => {
    const loteId = 1;
    const empresaId = 100;
    const mockLote = {
      id: loteId,
      codigo: 'LOT-001',
      empresaId,
      materiaPrima: 'MAIZ',
      parametros: [{ parametro: 'HUMEDAD' as Parametro, valor: 12 }],
    } as any;

    const mockConfig = [
      {
        parametro: 'HUMEDAD' as Parametro,
        umbralMin: 10,
        umbralMax: 15,
        empresaId,
        tipoMateriaPrima: 'MAIZ',
      },
    ] as any[];

    it('debe retornar temprano si el lote no existe', async () => {
      loteRepo.findOne.mockResolvedValue(null);

      await service.evaluarYClasificar(loteId, empresaId);

      expect(loteRepo.findOne).toHaveBeenCalledWith({
        where: { id: loteId, empresaId },
        relations: { parametros: true },
      });
      expect(configRepo.find).not.toHaveBeenCalled();
    });

    it('debe retornar temprano si no hay configuraciones para la materia prima', async () => {
      loteRepo.findOne.mockResolvedValue(mockLote);
      configRepo.find.mockResolvedValue([]);

      await service.evaluarYClasificar(loteId, empresaId);

      expect(configRepo.find).toHaveBeenCalledWith({
        where: { empresaId, tipoMateriaPrima: mockLote.materiaPrima },
      });
      expect(loteRepo.save).not.toHaveBeenCalled();
    });

    it('debe clasificar como APTO si los valores están dentro de los umbrales usando lecturas iniciales', async () => {
      loteRepo.findOne.mockResolvedValue(mockLote);
      configRepo.find.mockResolvedValue(mockConfig);
      mockQueryBuilder.getOne.mockResolvedValue(null);
      medicionManualRepo.findOne.mockResolvedValue(null);
      historialRepo.findOne.mockResolvedValue(null);
      historialRepo.create.mockImplementation((dto) => dto);

      await service.evaluarYClasificar(loteId, empresaId);

      expect(mockLote.clasificacion).toBe(ClasificacionLote.APTO);
      expect(loteRepo.save).toHaveBeenCalledWith(mockLote);
      expect(historialRepo.create).toHaveBeenCalledWith({
        loteId,
        empresaId,
        clasificacion: ClasificacionLote.APTO,
        parametrosUtilizados: [
          { parametro: 'HUMEDAD' as Parametro, valor: 12 },
        ],
      });
      expect(
        notificacionesService.notificarResponsablesCalidad,
      ).not.toHaveBeenCalled();
    });

    it('debe clasificar como NO_APTO y notificar si el valor excede el umbral máximo', async () => {
      const loteConHumedadAlta = {
        ...mockLote,
        parametros: [{ parametro: 'HUMEDAD' as Parametro, valor: 18 }], // Umbral máx es 15
      };

      loteRepo.findOne.mockResolvedValue(loteConHumedadAlta);
      configRepo.find.mockResolvedValue(mockConfig);
      mockQueryBuilder.getOne.mockResolvedValue(null);
      medicionManualRepo.findOne.mockResolvedValue(null);

      await service.evaluarYClasificar(loteId, empresaId);

      expect(loteConHumedadAlta.clasificacion).toBe(ClasificacionLote.NO_APTO);
      expect(loteRepo.save).toHaveBeenCalledWith(loteConHumedadAlta);
      expect(
        notificacionesService.notificarResponsablesCalidad,
      ).toHaveBeenCalledWith(
        empresaId,
        TipoNotificacion.LOTE_NO_APTO,
        `El lote ${mockLote.codigo} fue clasificado como no_apto.`,
        {
          loteId: mockLote.id,
          loteCodigo: mockLote.codigo,
          clasificacion: ClasificacionLote.NO_APTO,
        },
      );
    });

    it('debe usar la lectura del sensor si es más reciente que la medición manual', async () => {
      const fechaSensor = new Date();
      const fechaManual = new Date(fechaSensor.getTime() - 5000);

      loteRepo.findOne.mockResolvedValue(mockLote);
      configRepo.find.mockResolvedValue(mockConfig);

      mockQueryBuilder.getOne.mockResolvedValue({
        valor: '11.5',
        timestampLectura: fechaSensor,
        sensorId: 99,
      });

      medicionManualRepo.findOne.mockResolvedValue({
        valor: '12.0',
        createdAt: fechaManual,
      });

      sensorRepo.findOne.mockResolvedValue({
        id: 99,
        estado: EstadoSensor.ACTIVO,
      });

      await service.evaluarYClasificar(loteId, empresaId);

      expect(mockLote.clasificacion).toBe(ClasificacionLote.APTO);
      expect(historialRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parametrosUtilizados: [
            { parametro: 'HUMEDAD' as Parametro, valor: 11.5 },
          ],
        }),
      );
    });

    it('debe actualizar el historial anterior si tenía parametrosUtilizados vacíos', async () => {
      loteRepo.findOne.mockResolvedValue(mockLote);
      configRepo.find.mockResolvedValue(mockConfig);
      mockQueryBuilder.getOne.mockResolvedValue(null);
      medicionManualRepo.findOne.mockResolvedValue(null);

      const historialVacio = {
        id: 10,
        loteId,
        empresaId,
        parametrosUtilizados: [],
        clasificacion: null,
      };

      historialRepo.findOne.mockResolvedValue(historialVacio);

      await service.evaluarYClasificar(loteId, empresaId);

      expect(historialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 10,
          clasificacion: ClasificacionLote.APTO,
          parametrosUtilizados: [
            { parametro: 'HUMEDAD' as Parametro, valor: 12 },
          ],
        }),
      );
      expect(historialRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('historialDeLote', () => {
    it('debe retornar el historial ordenado descendentemente por createdAt', async () => {
      const loteId = 1;
      const empresaId = 100;
      const mockHistorial = [{ id: 1 }, { id: 2 }] as any;

      historialRepo.find.mockResolvedValue(mockHistorial);

      const resultado = await service.historialDeLote(loteId, empresaId);

      expect(resultado).toBe(mockHistorial);
      expect(historialRepo.find).toHaveBeenCalledWith({
        where: { loteId, empresaId },
        order: { createdAt: 'DESC' },
      });
    });
  });
});
