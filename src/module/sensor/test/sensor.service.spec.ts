import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SensorService } from '../sensor.service';
import { SENSOR_REPOSITORY } from '../repository/sensor.repository.interface';
import { SENSOR_LOTE_HISTORIAL_REPOSITORY } from '../repository/sensor-lote-historial.repository.interface';
import { LOTE_UBICACION_HISTORIAL_REPOSITORY } from '../../lote/repository/lote-ubicacion-historial.repository.interface';
import { LOTE_REPOSITORY } from '../../lote/repository/lote-repository.interface';
import { SensorMapper } from '../mappers/sensor.mapper';
import { EstadoSensor } from '../enums/estado-sensor.enum';
import { CreateSensorDto } from '../dto/create-sensor.dto';
import { UpdateSensorDto } from '../dto/update-sensor.dto';
import { SensorFilterQueryDto } from '../dto/sensor-filter-query.dto';
import { TenantContext } from '../../../common/types/tenant-context.type';
import { Sensor } from '../entities/sensor.entity';
import { Lote } from '../../lote/entities/lote.entity';

describe('SensorService', () => {
  let service: SensorService;
  let sensorRepoMock: any;
  let historialRepoMock: any;
  let loteUbicacionRepoMock: any;
  let loteRepoMock: any;

  const validTenant: TenantContext = { empresaId: 10 } as TenantContext;
  const invalidTenant: TenantContext = {} as TenantContext;

  beforeEach(async () => {
    sensorRepoMock = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByNombre: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      setEstado: jest.fn(),
    };

    historialRepoMock = {
      findUltimosPorSensores: jest.fn(),
      findUltimoPorSensor: jest.fn(),
      findBySensor: jest.fn(),
      create: jest.fn(),
    };

    loteUbicacionRepoMock = {
      findUltimoPorLote: jest.fn(),
      create: jest.fn(),
    };

    loteRepoMock = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensorService,
        { provide: SENSOR_REPOSITORY, useValue: sensorRepoMock },
        { provide: SENSOR_LOTE_HISTORIAL_REPOSITORY, useValue: historialRepoMock },
        { provide: LOTE_UBICACION_HISTORIAL_REPOSITORY, useValue: loteUbicacionRepoMock },
        { provide: LOTE_REPOSITORY, useValue: loteRepoMock },
      ],
    }).compile();

    service = module.get<SensorService>(SensorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('resolveEmpresaId (validación de tenant)', () => {
    it('debe lanzar BadRequestException si el tenant no contiene empresaId', async () => {
      await expect(
        service.findAll({} as SensorFilterQueryDto, invalidTenant),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    const dto: CreateSensorDto = {
      nombre: 'Sensor Temp 1',
      rangoMinFavor: 10,
      rangoMaxFavor: 50,
    } as any;

    it('debe crear un sensor correctamente si pasa las validaciones', async () => {
      sensorRepoMock.findByNombre.mockResolvedValue(null);
      const mappedEntity = { id: 1, ...dto, empresaId: 10 } as unknown as Sensor;
      sensorRepoMock.create.mockResolvedValue(mappedEntity);

      jest.spyOn(SensorMapper, 'toEntity').mockReturnValue(mappedEntity);
      jest.spyOn(SensorMapper, 'toResponseDto').mockReturnValue({ id: 1, nombre: 'Sensor Temp 1' } as any);

      const result = await service.create(dto, validTenant);

      expect(sensorRepoMock.findByNombre).toHaveBeenCalledWith(dto.nombre, 10);
      expect(sensorRepoMock.create).toHaveBeenCalledWith(mappedEntity);
      expect(result).toHaveProperty('id', 1);
    });

    it('debe lanzar BadRequestException si el rango mínimo es mayor o igual al máximo', async () => {
      const invalidDto = { ...dto, rangoMinFavor: 50, rangoMaxFavor: 10 };

      await expect(service.create(invalidDto, validTenant)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar ConflictException si ya existe un sensor con el mismo nombre en la empresa', async () => {
      sensorRepoMock.findByNombre.mockResolvedValue({ id: 99, nombre: dto.nombre });

      await expect(service.create(dto, validTenant)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('debe listar sensores con su lote actual asociado', async () => {
      const filter: SensorFilterQueryDto = {};
      const mockSensores = [{ id: 1 }, { id: 2 }] as Sensor[];
      const mockHistoriales = [{ sensorId: 1, loteIdNuevo: 100 }];

      sensorRepoMock.findAll.mockResolvedValue(mockSensores);
      historialRepoMock.findUltimosPorSensores.mockResolvedValue(mockHistoriales);

      const spyMapper = jest
        .spyOn(SensorMapper, 'toResponseDto')
        .mockImplementation((s, loteId) => ({ id: s.id, loteId } as any));

      const result = await service.findAll(filter, validTenant);

      expect(sensorRepoMock.findAll).toHaveBeenCalledWith(filter, 10);
      expect(historialRepoMock.findUltimosPorSensores).toHaveBeenCalledWith([1, 2], 10);
      expect(spyMapper).toHaveBeenCalledWith(mockSensores[0], 100);
      expect(spyMapper).toHaveBeenCalledWith(mockSensores[1], null);
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('debe retornar el DTO de un sensor por ID con su lote actual', async () => {
      const sensorMock = { id: 1, nombre: 'Sensor 1' } as Sensor;
      sensorRepoMock.findOne.mockResolvedValue(sensorMock);
      historialRepoMock.findUltimoPorSensor.mockResolvedValue({ loteIdNuevo: 50 });

      jest.spyOn(SensorMapper, 'toResponseDto').mockReturnValue({ id: 1, loteId: 50 } as any);

      const result = await service.findOne(1, validTenant);

      expect(sensorRepoMock.findOne).toHaveBeenCalledWith(1, 10);
      expect(historialRepoMock.findUltimoPorSensor).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual({ id: 1, loteId: 50 });
    });

    it('debe lanzar NotFoundException si el sensor no existe', async () => {
      sensorRepoMock.findOne.mockResolvedValue(null);

      await expect(service.findOne(99, validTenant)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const dto: UpdateSensorDto = { nombre: 'Nuevo Nombre', rangoMinFavor: 5, rangoMaxFavor: 30 };

    it('debe actualizar el sensor correctamente si los datos son válidos', async () => {
      const existingSensor = {
        id: 1,
        nombre: 'Viejo Nombre',
        rangoMinFavor: 0,
        rangoMaxFavor: 40,
      } as Sensor;

      sensorRepoMock.findOne.mockResolvedValue(existingSensor);
      sensorRepoMock.findByNombre.mockResolvedValue(null);
      sensorRepoMock.save.mockResolvedValue({ ...existingSensor, ...dto });
      historialRepoMock.findUltimoPorSensor.mockResolvedValue({ loteIdNuevo: 20 });

      jest.spyOn(SensorMapper, 'toResponseDto').mockReturnValue({ id: 1, nombre: 'Nuevo Nombre' } as any);

      const result = await service.update(1, dto, validTenant);

      expect(sensorRepoMock.save).toHaveBeenCalled();
      expect(result).toHaveProperty('nombre', 'Nuevo Nombre');
    });

    it('debe lanzar NotFoundException si el sensor a actualizar no existe', async () => {
      sensorRepoMock.findOne.mockResolvedValue(null);

      await expect(service.update(99, dto, validTenant)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar ConflictException si el nuevo nombre ya está ocupado por otro sensor', async () => {
      const existingSensor = { id: 1, nombre: 'Viejo Nombre' } as Sensor;
      sensorRepoMock.findOne.mockResolvedValue(existingSensor);
      sensorRepoMock.findByNombre.mockResolvedValue({ id: 2, nombre: 'Nuevo Nombre' });

      await expect(service.update(1, dto, validTenant)).rejects.toThrow(
        ConflictException,
      );
    });

    it('debe permitir mantener el mismo nombre sin lanzar ConflictException', async () => {
      const sameNameDto: UpdateSensorDto = { nombre: 'Mismo Nombre' };
      const existingSensor = { id: 1, nombre: 'Mismo Nombre', rangoMinFavor: 0, rangoMaxFavor: 10 } as Sensor;

      sensorRepoMock.findOne.mockResolvedValue(existingSensor);
      sensorRepoMock.save.mockResolvedValue(existingSensor);

      await expect(service.update(1, sameNameDto, validTenant)).resolves.not.toThrow();
    });
  });

  describe('remove (baja lógica)', () => {
    it('debe poner el sensor en estado INACTIVO en vez de borrarlo físicamente', async () => {
      const sensorMock = { id: 1, estado: EstadoSensor.ACTIVO } as Sensor;
      const desactivadoMock = { id: 1, estado: EstadoSensor.INACTIVO } as Sensor;
      sensorRepoMock.findOne
        .mockResolvedValueOnce(sensorMock)
        .mockResolvedValueOnce(desactivadoMock);
      historialRepoMock.findUltimoPorSensor.mockResolvedValue(null);

      jest.spyOn(SensorMapper, 'toResponseDto').mockReturnValue({ id: 1, estado: EstadoSensor.INACTIVO } as any);

      const result = await service.remove(1, validTenant);

      expect(sensorRepoMock.setEstado).toHaveBeenCalledWith(1, EstadoSensor.INACTIVO, 10);
      expect(sensorRepoMock.remove).not.toHaveBeenCalled();
      expect(result).toHaveProperty('estado', EstadoSensor.INACTIVO);
    });

    it('debe desactivar aunque el sensor esté asociado a un lote (no destruye el historial)', async () => {
      const sensorMock = { id: 1, estado: EstadoSensor.ACTIVO } as Sensor;
      sensorRepoMock.findOne.mockResolvedValue(sensorMock);
      historialRepoMock.findUltimoPorSensor.mockResolvedValue({ loteIdNuevo: 100 });

      jest.spyOn(SensorMapper, 'toResponseDto').mockReturnValue({ id: 1 } as any);

      await expect(service.remove(1, validTenant)).resolves.not.toThrow();
      expect(sensorRepoMock.setEstado).toHaveBeenCalledWith(1, EstadoSensor.INACTIVO, 10);
    });

    it('debe lanzar NotFoundException si el sensor a desactivar no existe', async () => {
      sensorRepoMock.findOne.mockResolvedValue(null);

      await expect(service.remove(99, validTenant)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('activate', () => {
    it('debe reactivar un sensor poniéndolo en estado ACTIVO', async () => {
      const sensorMock = { id: 1, estado: EstadoSensor.INACTIVO } as Sensor;
      const activadoMock = { id: 1, estado: EstadoSensor.ACTIVO } as Sensor;
      sensorRepoMock.findOne
        .mockResolvedValueOnce(sensorMock)
        .mockResolvedValueOnce(activadoMock);
      historialRepoMock.findUltimoPorSensor.mockResolvedValue(null);

      jest.spyOn(SensorMapper, 'toResponseDto').mockReturnValue({ id: 1, estado: EstadoSensor.ACTIVO } as any);

      const result = await service.activate(1, validTenant);

      expect(sensorRepoMock.setEstado).toHaveBeenCalledWith(1, EstadoSensor.ACTIVO, 10);
      expect(result).toHaveProperty('estado', EstadoSensor.ACTIVO);
    });

    it('debe lanzar NotFoundException si el sensor a activar no existe', async () => {
      sensorRepoMock.findOne.mockResolvedValue(null);

      await expect(service.activate(99, validTenant)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('asociarALote (HU-33)', () => {
    const loteId = 5;
    const usuarioId = 42;

    it('debe lanzar NotFoundException si el lote no existe', async () => {
      loteRepoMock.findById.mockResolvedValue(null);

      await expect(
        service.asociarALote(loteId, [1], usuarioId, validTenant),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar NotFoundException si alguno de los sensores no existe', async () => {
      loteRepoMock.findById.mockResolvedValue({ id: loteId } as Lote);
      sensorRepoMock.findOne.mockResolvedValue(null);

      await expect(
        service.asociarALote(loteId, [99], usuarioId, validTenant),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si el sensor no está en estado ACTIVO', async () => {
      loteRepoMock.findById.mockResolvedValue({ id: loteId } as Lote);
      sensorRepoMock.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Sensor Inactivo',
        estado: EstadoSensor.INACTIVO,
      } as Sensor);

      await expect(
        service.asociarALote(loteId, [1], usuarioId, validTenant),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe omitir la creación de un nuevo historial si el sensor ya estaba asociado al mismo lote', async () => {
      loteRepoMock.findById.mockResolvedValue({ id: loteId } as Lote);
      sensorRepoMock.findOne.mockResolvedValue({
        id: 1,
        estado: EstadoSensor.ACTIVO,
      } as Sensor);
      historialRepoMock.findUltimoPorSensor.mockResolvedValue({ loteIdNuevo: loteId });

      jest.spyOn(SensorMapper, 'toResponseDto').mockReturnValue({ id: 1, loteId } as any);

      const result = await service.asociarALote(loteId, [1], usuarioId, validTenant);

      expect(historialRepoMock.create).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('debe crear un registro de historial y actualizar la ubicación si cambia el lote', async () => {
      const loteMock = { id: loteId, ubicacionInicial: 'Bodega A' } as unknown as Lote;
      const sensorMock = {
        id: 1,
        estado: EstadoSensor.ACTIVO,
        ubicacion: 'Cámara 2',
      } as unknown as Sensor;

      loteRepoMock.findById.mockResolvedValue(loteMock);
      sensorRepoMock.findOne.mockResolvedValue(sensorMock);
      historialRepoMock.findUltimoPorSensor.mockResolvedValue({ loteIdNuevo: 2 });
      loteUbicacionRepoMock.findUltimoPorLote.mockResolvedValue({ ubicacionNueva: 'Bodega A' });

      jest.spyOn(SensorMapper, 'toResponseDto').mockReturnValue({ id: 1, loteId } as any);

      await service.asociarALote(loteId, [1], usuarioId, validTenant);

      expect(historialRepoMock.create).toHaveBeenCalled();
      expect(loteUbicacionRepoMock.create).toHaveBeenCalled();
    });
  });

  describe('historialPorSensor', () => {
    it('debe mapear y devolver el historial de cambios del sensor', async () => {
      const historialMock = [{ id: 10 }, { id: 11 }];
      historialRepoMock.findBySensor.mockResolvedValue(historialMock);

      jest.spyOn(SensorMapper, 'historialToResponseDto').mockImplementation(
        (h) => ({ id: h.id }) as any,
      );

      const result = await service.historialPorSensor(1, validTenant);

      expect(historialRepoMock.findBySensor).toHaveBeenCalledWith(1, 10);
      expect(result).toHaveLength(2);
    });
  });
});