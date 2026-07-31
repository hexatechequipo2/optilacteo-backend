import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

import { SensorInactividadTask } from '../tasks/sensor-inactividad.task';

import {
  SENSOR_INACTIVIDAD_REPOSITORY,
} from '../repository/sensor-inactividad.repository.interface';

import {
  SENSOR_REPOSITORY,
} from '../../sensor/repository/sensor.repository.interface';

import {
  SENSOR_EVENTO_REPOSITORY,
} from '../repository/sensor-evento.repository.interface';

import { LecturasGateway } from '../gateway/lecturas.gateway';
import { EstadoSensor } from '../../sensor/enums/estado-sensor.enum';
import { TipoEvento } from '../enums/tipo-evento.enum';

describe('SensorInactividadTask', () => {
  let task: SensorInactividadTask;

  const inactividadRepositoryMock = {
    findSensoresInactivos: jest.fn(),
  };

  const sensorRepositoryMock = {
    save: jest.fn(),
  };

  const eventoRepositoryMock = {
    create: jest.fn(),
  };

  const gatewayMock = {
    emitirSensorInactivo: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensorInactividadTask,
        {
          provide: SENSOR_INACTIVIDAD_REPOSITORY,
          useValue: inactividadRepositoryMock,
        },
        {
          provide: SENSOR_REPOSITORY,
          useValue: sensorRepositoryMock,
        },
        {
          provide: SENSOR_EVENTO_REPOSITORY,
          useValue: eventoRepositoryMock,
        },
        {
          provide: LecturasGateway,
          useValue: gatewayMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    task = module.get(SensorInactividadTask);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('detectarInactividad', () => {
    it('cuando no existen sensores inactivos, no debe guardar ni generar eventos', async () => {
      configServiceMock.get.mockReturnValue('5');
      inactividadRepositoryMock.findSensoresInactivos.mockResolvedValue([]);

      await task.detectarInactividad();

      expect(sensorRepositoryMock.save).not.toHaveBeenCalled();
      expect(eventoRepositoryMock.create).not.toHaveBeenCalled();
      expect(gatewayMock.emitirSensorInactivo).not.toHaveBeenCalled();
    });

    it('cuando encuentra sensores inactivos, debe marcarlos como INACTIVO y generar eventos', async () => {
      configServiceMock.get.mockReturnValue('5');

      const sensor = {
        id: 10,
        nombre: 'Sensor PH',
        empresaId: 3,
        estado: EstadoSensor.ACTIVO,
      };

      inactividadRepositoryMock.findSensoresInactivos.mockResolvedValue([
        sensor,
      ]);

      const warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();

      await task.detectarInactividad();

      expect(sensor.estado).toBe(EstadoSensor.INACTIVO);

      expect(sensorRepositoryMock.save).toHaveBeenCalledWith(sensor);

      expect(eventoRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoEvento: TipoEvento.SENSOR_INACTIVO,
          empresaId: 3,
          sensorId: 10,
        }),
      );

      expect(gatewayMock.emitirSensorInactivo).toHaveBeenCalledWith(
        {
          sensorId: 10,
          nombre: 'Sensor PH',
        },
        3,
      );

      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('debe procesar múltiples sensores', async () => {
      configServiceMock.get.mockReturnValue('5');

      inactividadRepositoryMock.findSensoresInactivos.mockResolvedValue([
        {
          id: 1,
          nombre: 'S1',
          empresaId: 1,
          estado: EstadoSensor.ACTIVO,
        },
        {
          id: 2,
          nombre: 'S2',
          empresaId: 2,
          estado: EstadoSensor.ACTIVO,
        },
      ]);

      await task.detectarInactividad();

      expect(sensorRepositoryMock.save).toHaveBeenCalledTimes(2);
      expect(eventoRepositoryMock.create).toHaveBeenCalledTimes(2);
      expect(gatewayMock.emitirSensorInactivo).toHaveBeenCalledTimes(2);
    });

    it('cuando la configuración no existe, debe usar el umbral por defecto', async () => {
      configServiceMock.get.mockReturnValue(undefined);

      inactividadRepositoryMock.findSensoresInactivos.mockResolvedValue([]);

      await task.detectarInactividad();

      expect(
        inactividadRepositoryMock.findSensoresInactivos,
      ).toHaveBeenCalledWith(expect.any(Date));
    });

    it('cuando la configuración no es numérica, debe usar el umbral por defecto', async () => {
      configServiceMock.get.mockReturnValue('abc');

      inactividadRepositoryMock.findSensoresInactivos.mockResolvedValue([]);

      await task.detectarInactividad();

      expect(
        inactividadRepositoryMock.findSensoresInactivos,
      ).toHaveBeenCalled();
    });

    it('cuando la configuración es menor o igual a cero, debe usar el umbral por defecto', async () => {
      configServiceMock.get.mockReturnValue('0');

      inactividadRepositoryMock.findSensoresInactivos.mockResolvedValue([]);

      await task.detectarInactividad();

      expect(
        inactividadRepositoryMock.findSensoresInactivos,
      ).toHaveBeenCalled();
    });

    it('cuando la configuración es válida, debe utilizar ese umbral', async () => {
      configServiceMock.get.mockReturnValue('10');

      inactividadRepositoryMock.findSensoresInactivos.mockResolvedValue([]);

      await task.detectarInactividad();

      expect(configServiceMock.get).toHaveBeenCalledWith(
        'SENSOR_INACTIVIDAD_UMBRAL_MINUTOS',
      );
    });
  });
});