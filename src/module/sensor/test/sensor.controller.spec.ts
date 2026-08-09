import { Test, TestingModule } from '@nestjs/testing';
import { SensorController } from '../sensor.controller';
import { SensorService } from '../sensor.service';
import { CreateSensorDto } from '../dto/create-sensor.dto';
import { UpdateSensorDto } from '../dto/update-sensor.dto';
import { SensorFilterQueryDto } from '../dto/sensor-filter-query.dto';
import { AsociarLoteDto } from '../dto/asociar-lote.dto';
import { TenantContext } from '../../../common/types/tenant-context.type';
import { ROLES } from '../../rol/constants/roles.constants';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';

describe('SensorController', () => {
  let controller: SensorController;
  let sensorServiceMock: jest.Mocked<SensorService>;

  const mockTenant: TenantContext = {
    empresaId: 10,
  } as TenantContext;

  const mockReq = {
    user: {
      sub: 42,
    },
  };

  beforeEach(async () => {
    sensorServiceMock = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      historialPorSensor: jest.fn(),
      update: jest.fn(),
      asociarALote: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<SensorService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SensorController],
      providers: [
        {
          provide: SensorService,
          useValue: sensorServiceMock,
        },
      ],
    }).compile();

    controller = module.get<SensorController>(SensorController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('debe llamar a sensorService.create con el dto y el tenant', async () => {
      const dto: CreateSensorDto = {
        codigo: 'SNS-001',
        nombre: 'Sensor de Temperatura 1',
      } as any;

      const expectedResult = { id: 1, ...dto };
      sensorServiceMock.create.mockResolvedValue(expectedResult as any);

      const result = await controller.create(dto, mockTenant);

      expect(sensorServiceMock.create).toHaveBeenCalledWith(dto, mockTenant);
      expect(result).toBe(expectedResult);
    });

    it('debe tener configurados los roles adecuados', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, controller.create);
      expect(roles).toEqual([
        ROLES.RESPONSABLE_PRODUCCION,
        ROLES.RESPONSABLE_CALIDAD,
      ]);
    });
  });

  describe('findAll', () => {
    it('debe llamar a sensorService.findAll con la query y el tenant', async () => {
      const query: SensorFilterQueryDto = { page: 1, limit: 10 } as any;
      const expectedResult = { data: [], total: 0 };

      sensorServiceMock.findAll.mockResolvedValue(expectedResult as any);

      const result = await controller.findAll(query, mockTenant);

      expect(sensorServiceMock.findAll).toHaveBeenCalledWith(query, mockTenant);
      expect(result).toBe(expectedResult);
    });

    it('debe tener configurados los roles adecuados', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, controller.findAll);
      expect(roles).toEqual([
        ROLES.RESPONSABLE_PRODUCCION,
        ROLES.OPERARIO_LINEA,
        ROLES.RESPONSABLE_CALIDAD,
        ROLES.GERENTE,
        ROLES.ADMINISTRADOR,
      ]);
    });
  });

  describe('findOne', () => {
    it('debe castear id a número y llamar a sensorService.findOne', async () => {
      const idStr = '15';
      const expectedResult = { id: 15, codigo: 'SNS-015' };

      sensorServiceMock.findOne.mockResolvedValue(expectedResult as any);

      const result = await controller.findOne(idStr, mockTenant);

      expect(sensorServiceMock.findOne).toHaveBeenCalledWith(15, mockTenant);
      expect(result).toBe(expectedResult);
    });

    it('debe tener configurados los roles adecuados', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, controller.findOne);
      expect(roles).toEqual([
        ROLES.RESPONSABLE_PRODUCCION,
        ROLES.OPERARIO_LINEA,
        ROLES.RESPONSABLE_CALIDAD,
        ROLES.GERENTE,
        ROLES.ADMINISTRADOR,
      ]);
    });
  });

  describe('historialPorSensor', () => {
    it('debe castear id a número y llamar a sensorService.historialPorSensor', async () => {
      const idStr = '8';
      const expectedResult = [{ id: 101, valor: 25.4 }];

      sensorServiceMock.historialPorSensor.mockResolvedValue(
        expectedResult as any,
      );

      const result = await controller.historialPorSensor(idStr, mockTenant);

      expect(sensorServiceMock.historialPorSensor).toHaveBeenCalledWith(
        8,
        mockTenant,
      );
      expect(result).toBe(expectedResult);
    });

    it('debe tener configurados los roles adecuados', () => {
      const roles = Reflect.getMetadata(
        ROLES_KEY,
        controller.historialPorSensor,
      );
      expect(roles).toEqual([
        ROLES.RESPONSABLE_PRODUCCION,
        ROLES.OPERARIO_LINEA,
        ROLES.RESPONSABLE_CALIDAD,
        ROLES.GERENTE,
        ROLES.ADMINISTRADOR,
      ]);
    });
  });

  describe('update', () => {
    it('debe castear id a número y llamar a sensorService.update con el dto y tenant', async () => {
      const idStr = '3';
      const dto: UpdateSensorDto = { nombre: 'Sensor Actualizado' };
      const expectedResult = { id: 3, ...dto };

      sensorServiceMock.update.mockResolvedValue(expectedResult as any);

      const result = await controller.update(idStr, dto, mockTenant);

      expect(sensorServiceMock.update).toHaveBeenCalledWith(3, dto, mockTenant);
      expect(result).toBe(expectedResult);
    });

    it('debe tener configurados los roles adecuados', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, controller.update);
      expect(roles).toEqual([
        ROLES.RESPONSABLE_PRODUCCION,
        ROLES.RESPONSABLE_CALIDAD,
      ]);
    });
  });

  describe('asociarALote', () => {
    it('debe castear loteId a número y llamar a sensorService.asociarALote con el array de sensorIds y el usuario', async () => {
      const loteIdStr = '50';
      const dto: AsociarLoteDto = { sensorIds: [1, 2, 3] };
      const expectedResult = { success: true };

      sensorServiceMock.asociarALote.mockResolvedValue(expectedResult as any);

      const result = await controller.asociarALote(
        loteIdStr,
        dto,
        mockTenant,
        mockReq,
      );

      expect(sensorServiceMock.asociarALote).toHaveBeenCalledWith(
        50,
        [1, 2, 3],
        42, // req.user.sub
        mockTenant,
      );
      expect(result).toBe(expectedResult);
    });

    it('debe tener configurados los roles adecuados', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, controller.asociarALote);
      expect(roles).toEqual([ROLES.OPERARIO_LINEA, ROLES.RESPONSABLE_CALIDAD]);
    });
  });

  describe('remove', () => {
    it('debe castear id a número y llamar a sensorService.remove', async () => {
      const idStr = '12';
      const expectedResult = { deleted: true };

      sensorServiceMock.remove.mockResolvedValue(expectedResult as any);

      const result = await controller.remove(idStr, mockTenant);

      expect(sensorServiceMock.remove).toHaveBeenCalledWith(12, mockTenant);
      expect(result).toBe(expectedResult);
    });

    it('debe tener configurados los roles adecuados', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, controller.remove);
      expect(roles).toEqual([
        ROLES.RESPONSABLE_PRODUCCION,
        ROLES.RESPONSABLE_CALIDAD,
      ]);
    });
  });
});
