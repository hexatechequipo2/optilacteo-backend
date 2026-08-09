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

import type { TenantContext } from '../../../common/types/tenant-context.type';
import type { Sensor } from '../entities/sensor.entity';
import type { Lote } from '../../lote/entities/lote.entity';

import { ROLES } from '../../rol/constants/roles.constants';
import { AuditLogService } from '../../audit/audit-log.service';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

describe('SensorService', () => {
  let service: SensorService;

  let sensorRepoMock: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    findByNombre: jest.Mock;
    save: jest.Mock;
  };

  let historialRepoMock: {
    findUltimosPorSensores: jest.Mock;
    findUltimoPorSensor: jest.Mock;
    findBySensor: jest.Mock;
    create: jest.Mock;
  };

  let loteUbicacionRepoMock: {
    findUltimoPorLote: jest.Mock;
    create: jest.Mock;
  };

  let loteRepoMock: {
    findById: jest.Mock;
  };

  let auditLogServiceMock: {
    getTrazabilidadBatch: jest.Mock;
    getTrazabilidad: jest.Mock;
  };

  const validTenant: TenantContext = {
    empresaId: 10,
  } as TenantContext;

  const gerenteTenant: TenantContext = {
    empresaId: 10,
    rolNombre: ROLES.GERENTE,
  };

  const invalidTenant: TenantContext = {
    empresaId: null,
  } as TenantContext;

  beforeEach(async () => {
    sensorRepoMock = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByNombre: jest.fn(),
      save: jest.fn(),
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

    auditLogServiceMock = {
      getTrazabilidadBatch: jest.fn(),
      getTrazabilidad: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensorService,
        {
          provide: SENSOR_REPOSITORY,
          useValue: sensorRepoMock,
        },
        {
          provide: SENSOR_LOTE_HISTORIAL_REPOSITORY,
          useValue: historialRepoMock,
        },
        {
          provide: LOTE_UBICACION_HISTORIAL_REPOSITORY,
          useValue: loteUbicacionRepoMock,
        },
        {
          provide: LOTE_REPOSITORY,
          useValue: loteRepoMock,
        },
        {
          provide: AuditLogService,
          useValue: auditLogServiceMock,
        },
      ],
    }).compile();

    service = module.get<SensorService>(SensorService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  // ============================================================
  // 1
  // ============================================================

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  // ============================================================
  // 2
  // ============================================================

  describe('resolveEmpresaId', () => {
    it('debe lanzar BadRequestException si el tenant no tiene empresaId', async () => {
      await expect(service.findAll({}, invalidTenant)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================
  // CREATE - 3, 4, 5
  // ============================================================

  describe('create', () => {
    const dto: CreateSensorDto = {
      nombre: 'Sensor Temp 1',
      rangoMinFavor: 10,
      rangoMaxFavor: 50,
    } as CreateSensorDto;

    it('debe crear un sensor correctamente', async () => {
      const mappedEntity = {
        id: 1,
        ...dto,
        empresaId: 10,
      } as unknown as Sensor;

      const responseDto = {
        id: 1,
        nombre: dto.nombre,
      };

      sensorRepoMock.findByNombre.mockResolvedValue(null);
      sensorRepoMock.create.mockResolvedValue(mappedEntity);

      jest.spyOn(SensorMapper, 'toEntity').mockReturnValue(mappedEntity);

      jest
        .spyOn(SensorMapper, 'toResponseDto')
        .mockReturnValue(responseDto as any);

      const result = await service.create(dto, validTenant);

      expect(sensorRepoMock.findByNombre).toHaveBeenCalledWith(dto.nombre, 10);

      expect(sensorRepoMock.create).toHaveBeenCalledWith(mappedEntity);

      expect(result).toEqual(responseDto);
    });

    it('debe lanzar BadRequestException si el rango mínimo es mayor o igual al máximo', async () => {
      const invalidDto = {
        ...dto,
        rangoMinFavor: 50,
        rangoMaxFavor: 10,
      };

      await expect(service.create(invalidDto, validTenant)).rejects.toThrow(
        BadRequestException,
      );

      expect(sensorRepoMock.findByNombre).not.toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si ya existe un sensor con el mismo nombre', async () => {
      sensorRepoMock.findByNombre.mockResolvedValue({
        id: 99,
        nombre: dto.nombre,
      });

      await expect(service.create(dto, validTenant)).rejects.toThrow(
        ConflictException,
      );

      expect(sensorRepoMock.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // FIND ALL - 6
  // ============================================================

  describe('findAll', () => {
    it('debe listar sensores, incluir el lote actual y agregar auditoría para GERENTE', async () => {
      const filter = {} as SensorFilterQueryDto;

      const sensores = [
        {
          id: 1,
          nombre: 'Sensor 1',
        },
        {
          id: 2,
          nombre: 'Sensor 2',
        },
      ] as Sensor[];

      const historiales = [
        {
          sensorId: 1,
          loteIdNuevo: 100,
        },
        {
          sensorId: 2,
          loteIdNuevo: null,
        },
      ];

      const auditoria = new Map<number, any>([
        [1, { creadoPor: { id: 10, nombre: 'Usuario 1' } }],
        [2, { creadoPor: { id: 20, nombre: 'Usuario 2' } }],
      ]);

      sensorRepoMock.findAll.mockResolvedValue(sensores);
      historialRepoMock.findUltimosPorSensores.mockResolvedValue(historiales);

      auditLogServiceMock.getTrazabilidadBatch.mockResolvedValue(auditoria);

      jest
        .spyOn(SensorMapper, 'toResponseDto')
        .mockImplementation((sensor: Sensor, loteId?: number | null) => {
          return {
            id: sensor.id,
            nombre: sensor.nombre,
            loteId: loteId ?? null,
          } as any;
        });

      const result = await service.findAll(filter, gerenteTenant);

      expect(sensorRepoMock.findAll).toHaveBeenCalledWith(filter, 10);

      expect(historialRepoMock.findUltimosPorSensores).toHaveBeenCalledWith(
        [1, 2],
        10,
      );

      expect(auditLogServiceMock.getTrazabilidadBatch).toHaveBeenCalledWith(
        'Sensor',
        [1, 2],
        10,
      );

      expect(result).toHaveLength(2);

      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 1,
          loteId: 100,
          auditoria: auditoria.get(1),
        }),
      );

      expect(result[1]).toEqual(
        expect.objectContaining({
          id: 2,
          loteId: null,
          auditoria: auditoria.get(2),
        }),
      );
    });
  });

  // ============================================================
  // FIND ONE - 7, 8
  // ============================================================

  describe('findOne', () => {
    it('debe retornar el sensor con su lote actual y trazabilidad para GERENTE', async () => {
      const sensor = {
        id: 1,
        nombre: 'Sensor 1',
      } as Sensor;

      const auditoria = {
        creadoPor: {
          id: 10,
          nombre: 'Usuario',
        },
      };

      sensorRepoMock.findOne.mockResolvedValue(sensor);

      historialRepoMock.findUltimoPorSensor.mockResolvedValue({
        loteIdNuevo: 50,
      });

      auditLogServiceMock.getTrazabilidad.mockResolvedValue(auditoria);

      jest.spyOn(SensorMapper, 'toResponseDto').mockReturnValue({
        id: 1,
        nombre: 'Sensor 1',
        loteId: 50,
      } as any);

      const result = await service.findOne(1, gerenteTenant);

      expect(sensorRepoMock.findOne).toHaveBeenCalledWith(1, 10);

      expect(historialRepoMock.findUltimoPorSensor).toHaveBeenCalledWith(1, 10);

      expect(auditLogServiceMock.getTrazabilidad).toHaveBeenCalledWith(
        'Sensor',
        1,
        10,
      );

      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          loteId: 50,
          auditoria,
        }),
      );
    });

    it('debe lanzar NotFoundException si el sensor no existe', async () => {
      sensorRepoMock.findOne.mockResolvedValue(null);

      await expect(service.findOne(99, validTenant)).rejects.toThrow(
        NotFoundException,
      );

      expect(historialRepoMock.findUltimoPorSensor).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // UPDATE - 9, 10, 11
  // ============================================================

  describe('update', () => {
    const dto: UpdateSensorDto = {
      nombre: 'Nuevo Nombre',
      rangoMinFavor: 5,
      rangoMaxFavor: 30,
    };

    it('debe actualizar el sensor correctamente', async () => {
      const sensor = {
        id: 1,
        nombre: 'Nombre Anterior',
        rangoMinFavor: 0,
        rangoMaxFavor: 40,
      } as Sensor;

      const actualizado = {
        ...sensor,
        ...dto,
      };

      sensorRepoMock.findOne.mockResolvedValue(sensor);
      sensorRepoMock.findByNombre.mockResolvedValue(null);
      sensorRepoMock.save.mockResolvedValue(actualizado);

      historialRepoMock.findUltimoPorSensor.mockResolvedValue({
        loteIdNuevo: 20,
      });

      jest.spyOn(SensorMapper, 'toResponseDto').mockReturnValue({
        id: 1,
        nombre: 'Nuevo Nombre',
        loteId: 20,
      } as any);

      const result = await service.update(1, dto, validTenant);

      expect(sensorRepoMock.findOne).toHaveBeenCalledWith(1, 10);

      expect(sensorRepoMock.findByNombre).toHaveBeenCalledWith(dto.nombre, 10);

      expect(sensorRepoMock.save).toHaveBeenCalledWith(sensor);

      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          nombre: 'Nuevo Nombre',
        }),
      );
    });

    it('debe lanzar NotFoundException si el sensor no existe', async () => {
      sensorRepoMock.findOne.mockResolvedValue(null);

      await expect(service.update(99, dto, validTenant)).rejects.toThrow(
        NotFoundException,
      );

      expect(sensorRepoMock.save).not.toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si el nuevo nombre pertenece a otro sensor', async () => {
      const sensor = {
        id: 1,
        nombre: 'Nombre Anterior',
        rangoMinFavor: 0,
        rangoMaxFavor: 40,
      } as Sensor;

      sensorRepoMock.findOne.mockResolvedValue(sensor);

      sensorRepoMock.findByNombre.mockResolvedValue({
        id: 2,
        nombre: dto.nombre,
      });

      await expect(service.update(1, dto, validTenant)).rejects.toThrow(
        ConflictException,
      );

      expect(sensorRepoMock.save).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // REMOVE - 12, 13, 14
  // ============================================================

  describe('remove', () => {
    it('debe desactivar el sensor mediante soft-delete', async () => {
      const sensor = {
        id: 1,
        nombre: 'Sensor 1',
        estado: EstadoSensor.ACTIVO,
      } as Sensor;

      const actualizado = {
        ...sensor,
        estado: EstadoSensor.INACTIVO,
      } as Sensor;

      sensorRepoMock.findOne.mockResolvedValue(sensor);

      historialRepoMock.findUltimoPorSensor.mockResolvedValue(null);

      sensorRepoMock.save.mockResolvedValue(actualizado);

      jest.spyOn(SensorMapper, 'toResponseDto').mockReturnValue({
        id: 1,
        nombre: 'Sensor 1',
        estado: EstadoSensor.INACTIVO,
        loteId: null,
      } as any);

      const result = await service.remove(1, validTenant);

      expect(sensor.estado).toBe(EstadoSensor.INACTIVO);

      expect(sensorRepoMock.save).toHaveBeenCalledWith(sensor);

      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          estado: EstadoSensor.INACTIVO,
        }),
      );
    });

    it('debe lanzar BadRequestException si el sensor ya está inactivo', async () => {
      const sensor = {
        id: 1,
        estado: EstadoSensor.INACTIVO,
      } as Sensor;

      sensorRepoMock.findOne.mockResolvedValue(sensor);

      await expect(service.remove(1, validTenant)).rejects.toThrow(
        BadRequestException,
      );

      expect(historialRepoMock.findUltimoPorSensor).not.toHaveBeenCalled();

      expect(sensorRepoMock.save).not.toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si el sensor está asociado a un lote', async () => {
      const sensor = {
        id: 1,
        estado: EstadoSensor.ACTIVO,
      } as Sensor;

      sensorRepoMock.findOne.mockResolvedValue(sensor);

      historialRepoMock.findUltimoPorSensor.mockResolvedValue({
        loteIdNuevo: 100,
      });

      await expect(service.remove(1, validTenant)).rejects.toThrow(
        ConflictException,
      );

      expect(sensorRepoMock.save).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // ACTIVAR - 15, 16, 17
  // ============================================================

  describe('activar', () => {
    it('debe activar correctamente un sensor inactivo', async () => {
      const sensor = {
        id: 1,
        nombre: 'Sensor 1',
        estado: EstadoSensor.INACTIVO,
      } as Sensor;

      const actualizado = {
        ...sensor,
        estado: EstadoSensor.ACTIVO,
      } as Sensor;

      sensorRepoMock.findOne.mockResolvedValue(sensor);
      sensorRepoMock.save.mockResolvedValue(actualizado);

      historialRepoMock.findUltimoPorSensor.mockResolvedValue({
        loteIdNuevo: 50,
      });

      jest.spyOn(SensorMapper, 'toResponseDto').mockReturnValue({
        id: 1,
        nombre: 'Sensor 1',
        estado: EstadoSensor.ACTIVO,
        loteId: 50,
      } as any);

      const result = await service.activar(1, validTenant);

      expect(sensor.estado).toBe(EstadoSensor.ACTIVO);

      expect(sensorRepoMock.save).toHaveBeenCalledWith(sensor);

      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          estado: EstadoSensor.ACTIVO,
        }),
      );
    });

    it('debe lanzar BadRequestException si el sensor ya está activo', async () => {
      const sensor = {
        id: 1,
        estado: EstadoSensor.ACTIVO,
      } as Sensor;

      sensorRepoMock.findOne.mockResolvedValue(sensor);

      await expect(service.activar(1, validTenant)).rejects.toThrow(
        BadRequestException,
      );

      expect(sensorRepoMock.save).not.toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si el sensor no existe', async () => {
      sensorRepoMock.findOne.mockResolvedValue(null);

      await expect(service.activar(99, validTenant)).rejects.toThrow(
        NotFoundException,
      );

      expect(sensorRepoMock.save).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // ASOCIAR A LOTE - 18, 19
  // ============================================================

  describe('asociarALote (HU-33)', () => {
    const loteId = 5;
    const usuarioId = 42;

    it('debe asociar un sensor activo a un lote y registrar los historiales', async () => {
      const lote = {
        id: loteId,
        ubicacionInicial: 'Bodega A',
      } as unknown as Lote;

      const sensor = {
        id: 1,
        nombre: 'Sensor 1',
        estado: EstadoSensor.ACTIVO,
        ubicacion: 'Camara 2',
      } as unknown as Sensor;

      loteRepoMock.findById.mockResolvedValue(lote);

      sensorRepoMock.findOne.mockResolvedValue(sensor);

      historialRepoMock.findUltimoPorSensor.mockResolvedValue({
        loteIdNuevo: 2,
      });

      loteUbicacionRepoMock.findUltimoPorLote.mockResolvedValue({
        ubicacionNueva: 'Bodega A',
      });

      jest.spyOn(SensorMapper, 'toResponseDto').mockReturnValue({
        id: 1,
        nombre: 'Sensor 1',
        loteId: loteId,
      } as any);

      const result = await service.asociarALote(
        loteId,
        [1],
        usuarioId,
        validTenant,
      );

      expect(loteRepoMock.findById).toHaveBeenCalledWith(loteId, 10);

      expect(sensorRepoMock.findOne).toHaveBeenCalledWith(1, 10);

      expect(historialRepoMock.create).toHaveBeenCalledTimes(1);

      expect(loteUbicacionRepoMock.create).toHaveBeenCalledTimes(1);

      expect(result).toHaveLength(1);

      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 1,
          loteId: 5,
        }),
      );
    });

    it('debe lanzar NotFoundException si el lote no existe', async () => {
      loteRepoMock.findById.mockResolvedValue(null);

      await expect(
        service.asociarALote(loteId, [1], usuarioId, validTenant),
      ).rejects.toThrow(NotFoundException);

      expect(sensorRepoMock.findOne).not.toHaveBeenCalled();

      expect(historialRepoMock.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // HISTORIAL - 20
  // ============================================================

  describe('historialPorSensor', () => {
    it('debe devolver el historial del sensor mapeado', async () => {
      const historial = [
        {
          id: 10,
          sensorId: 1,
          loteIdNuevo: 100,
        },
        {
          id: 11,
          sensorId: 1,
          loteIdNuevo: 200,
        },
      ];

      historialRepoMock.findBySensor.mockResolvedValue(historial);

      jest.spyOn(SensorMapper, 'historialToResponseDto').mockImplementation(
        (item: any) =>
          ({
            id: item.id,
            sensorId: item.sensorId,
            loteIdNuevo: item.loteIdNuevo,
          }) as any,
      );

      const result = await service.historialPorSensor(1, validTenant);

      expect(historialRepoMock.findBySensor).toHaveBeenCalledWith(1, 10);

      expect(SensorMapper.historialToResponseDto).toHaveBeenCalledTimes(2);

      expect(result).toHaveLength(2);

      expect(result[0]).toEqual({
        id: 10,
        sensorId: 1,
        loteIdNuevo: 100,
      });

      expect(result[1]).toEqual({
        id: 11,
        sensorId: 1,
        loteIdNuevo: 200,
      });
    });
  });
});
