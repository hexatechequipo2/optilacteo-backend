import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SensorDesconexionCronService } from '../cron/sensor-desconexion-cron.service';
import { Sensor } from '../../sensor/entities/sensor.entity';
import { EstadoSensor } from '../../sensor/enums/estado-sensor.enum';
import { ConfiguracionAlertaDesconexionService } from '../configuracion-alerta-desconexion.service';
import { NotificacionesService } from '../notificaciones.service';

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

describe('SensorDesconexionCronService', () => {
  let service: SensorDesconexionCronService;
  let sensorRepository: jest.Mocked<Repository<Sensor>>;
  let configService: jest.Mocked<ConfiguracionAlertaDesconexionService>;
  let notificacionesService: jest.Mocked<NotificacionesService>;

  const mockSensorRepo = {
    find: jest.fn(),
  };

  const mockConfigService = {
    obtenerOCrear: jest.fn(),
  };

  const mockNotificacionesService = {
    generarAlertaSensorDesconectado: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensorDesconexionCronService,
        {
          provide: getRepositoryToken(Sensor),
          useValue: mockSensorRepo,
        },
        {
          provide: ConfiguracionAlertaDesconexionService,
          useValue: mockConfigService,
        },
        {
          provide: NotificacionesService,
          useValue: mockNotificacionesService,
        },
      ],
    }).compile();

    service = module.get<SensorDesconexionCronService>(
      SensorDesconexionCronService,
    );
    sensorRepository = module.get(getRepositoryToken(Sensor));
    configService = module.get(ConfiguracionAlertaDesconexionService);
    notificacionesService = module.get(NotificacionesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('verificarDesconexiones', () => {
    it('debe omitir la ejecución si ya hay un proceso en curso (control de solapamiento)', async () => {
      // Simular que el proceso ya está en ejecución
      (service as any).ejecutando = true;

      await service.verificarDesconexiones();

      expect(sensorRepository.find).not.toHaveBeenCalled();
    });

    it('debe procesar sensores activos y no generar alerta si el tiempo sin datos es menor al umbral', async () => {
      const ahora = new Date();
      const hace5Minutos = new Date(ahora.getTime() - 5 * 60000);

      const sensoresMock = [
        {
          id: 1,
          nombre: 'Sensor 1',
          empresaId: 10,
          estado: EstadoSensor.ACTIVO,
          umbralDesconexionMinutos: 15,
          ultimaLectura: hace5Minutos,
          createdAt: hace5Minutos,
        },
      ] as Sensor[];

      sensorRepository.find.mockResolvedValue(sensoresMock);

      await service.verificarDesconexiones();

      expect(sensorRepository.find).toHaveBeenCalledWith({
        where: { estado: EstadoSensor.ACTIVO },
      });
      expect(
        notificacionesService.generarAlertaSensorDesconectado,
      ).not.toHaveBeenCalled();
      expect((service as any).ejecutando).toBe(false);
    });

    it('debe generar alerta si la última lectura supera el umbral propio del sensor', async () => {
      const ahora = new Date();
      const hace30Minutos = new Date(ahora.getTime() - 30 * 60000);

      const sensoresMock = [
        {
          id: 1,
          nombre: 'Sensor Temp 1',
          empresaId: 10,
          estado: EstadoSensor.ACTIVO,
          umbralDesconexionMinutos: 15,
          ultimaLectura: hace30Minutos,
          createdAt: hace30Minutos,
        },
      ] as Sensor[];

      sensorRepository.find.mockResolvedValue(sensoresMock);

      await service.verificarDesconexiones();

      expect(
        notificacionesService.generarAlertaSensorDesconectado,
      ).toHaveBeenCalledWith({
        empresaId: 10,
        sensorId: 1,
        sensorNombre: 'Sensor Temp 1',
        ultimaLectura: hace30Minutos,
        minutosSinDatos: 30,
      });
    });

    it('debe usar createdAt como referencia de tiempo si ultimaLectura es null', async () => {
      const ahora = new Date();
      const hace20Minutos = new Date(ahora.getTime() - 20 * 60000);

      const sensoresMock = [
        {
          id: 2,
          nombre: 'Sensor Nuevo',
          empresaId: 10,
          estado: EstadoSensor.ACTIVO,
          umbralDesconexionMinutos: 10,
          ultimaLectura: null,
          createdAt: hace20Minutos,
        },
      ] as Sensor[];

      sensorRepository.find.mockResolvedValue(sensoresMock);

      await service.verificarDesconexiones();

      expect(
        notificacionesService.generarAlertaSensorDesconectado,
      ).toHaveBeenCalledWith({
        empresaId: 10,
        sensorId: 2,
        sensorNombre: 'Sensor Nuevo',
        ultimaLectura: null,
        minutosSinDatos: 20,
      });
    });

    it('debe recurrir al umbral por defecto de la empresa (y usar caché) si el sensor no tiene umbral propio', async () => {
      const ahora = new Date();
      const hace25Minutos = new Date(ahora.getTime() - 25 * 60000);

      const sensoresMock = [
        {
          id: 1,
          nombre: 'Sensor A',
          empresaId: 10,
          estado: EstadoSensor.ACTIVO,
          umbralDesconexionMinutos: null,
          ultimaLectura: hace25Minutos,
          createdAt: hace25Minutos,
        },
        {
          id: 2,
          nombre: 'Sensor B',
          empresaId: 10,
          estado: EstadoSensor.ACTIVO,
          umbralDesconexionMinutos: null,
          ultimaLectura: hace25Minutos,
          createdAt: hace25Minutos,
        },
      ] as Sensor[];

      sensorRepository.find.mockResolvedValue(sensoresMock);
      configService.obtenerOCrear.mockResolvedValue({
        id: 1,
        empresaId: 10,
        umbralMinutos: 20,
      } as any);

      await service.verificarDesconexiones();

      // Debe consultar el servicio de configuración solo 1 vez debido al caché en memoria
      expect(configService.obtenerOCrear).toHaveBeenCalledTimes(1);
      expect(configService.obtenerOCrear).toHaveBeenCalledWith(10);

      // Ambos sensores superaron los 20 min del umbral de empresa (llevan 25 min)
      expect(
        notificacionesService.generarAlertaSensorDesconectado,
      ).toHaveBeenCalledTimes(2);
    });

    it('debe atrapar errores individuales por sensor y continuar con los siguientes sin interrumpir la ejecución', async () => {
      const ahora = new Date();
      const hace40Minutos = new Date(ahora.getTime() - 40 * 60000);

      const sensoresMock = [
        {
          id: 1,
          nombre: 'Sensor Falla',
          empresaId: 10,
          estado: EstadoSensor.ACTIVO,
          umbralDesconexionMinutos: 10,
          ultimaLectura: hace40Minutos,
          createdAt: hace40Minutos,
        },
        {
          id: 2,
          nombre: 'Sensor OK',
          empresaId: 10,
          estado: EstadoSensor.ACTIVO,
          umbralDesconexionMinutos: 10,
          ultimaLectura: hace40Minutos,
          createdAt: hace40Minutos,
        },
      ] as Sensor[];

      sensorRepository.find.mockResolvedValue(sensoresMock);

      notificacionesService.generarAlertaSensorDesconectado
        .mockRejectedValueOnce(new Error('Fallo simulado en la BD'))
        .mockResolvedValueOnce([]);

      await service.verificarDesconexiones();

      expect(
        notificacionesService.generarAlertaSensorDesconectado,
      ).toHaveBeenCalledTimes(2);
      expect((service as any).ejecutando).toBe(false);
    });

    it('debe restablecer el flag ejecutando a false incluso si ocurre un error no controlado', async () => {
      sensorRepository.find.mockRejectedValue(
        new Error('Error crítico de conexión DB'),
      );

      await expect(service.verificarDesconexiones()).rejects.toThrow(
        'Error crítico de conexión DB',
      );

      expect((service as any).ejecutando).toBe(false);
    });
  });
});
