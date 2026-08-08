import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { LoteService } from '../lote.service';
import { LOTE_REPOSITORY } from '../repository/lote-repository.interface';

import { Proveedor } from '../../proveedores/entities/proveedor.entity';
import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { SensorLectura } from '../../lectura-sensor/entities/sensor-lectura.entity';
import { SensorService } from '../../sensor/sensor.service';
import { ClasificacionLoteService } from '../clasificacion-lote.service';
import { LoteRevisionCalidad } from '../entities/lote-revision-calidad.entity';
import { ConfiguracionComparacionHistoricaService } from '../../config-parametro/configuracion-comparacion-historica.service';
import { AuditLogService } from '../../audit/audit-log.service';

import { EstadoProveedor } from '../../proveedores/enums/estado-proveedor.enum';
import { EstadoLote } from '../enums/estado-lote.enum';
import { EstadoSensor } from '../../sensor/enums/estado-sensor.enum';
import { ClasificacionLote } from '../enums/clasificacion-lote.enum';
import { DecisionRevision } from '../enums/decision-revision.enum';
import { DestinoLote } from '../enums/destino-lote.enum';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { ROLES } from '../../rol/constants/roles.constants';

import { TenantContext } from '../../../common/types/tenant-context.type';

type MockRepository<T extends Record<string, any> = any> = {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  createQueryBuilder: jest.Mock;
};

const createMockRepository = <
  T extends Record<string, any> = any,
>(): MockRepository<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createMockLoteRepository = (): {
  create: jest.Mock;
  save: jest.Mock;
  findById: jest.Mock;
  findByCodigo: jest.Mock;
  findAll: jest.Mock;
  countByEmpresa: jest.Mock;
  findNoAptosSinRevisionVigente: jest.Mock;
  findUltimosAptos: jest.Mock;
} => ({
  create: jest.fn(),
  save: jest.fn(),
  findById: jest.fn(),
  findByCodigo: jest.fn(),
  findAll: jest.fn(),
  countByEmpresa: jest.fn(),
  findNoAptosSinRevisionVigente: jest.fn(),
  findUltimosAptos: jest.fn(),
});

describe('LoteService', () => {
  let service: LoteService;
  let loteRepository: ReturnType<typeof createMockLoteRepository>;
  let proveedorRepository: MockRepository<Proveedor>;
  let configParametroRepository: MockRepository<ConfiguracionParametro>;
  let sensorLecturaRepository: MockRepository<SensorLectura>;
  let loteRevisionRepository: MockRepository<LoteRevisionCalidad>;
  let sensorService: jest.Mocked<Partial<SensorService>>;
  let clasificacionLoteService: jest.Mocked<
    Pick<ClasificacionLoteService, 'evaluarYClasificar' | 'historialDeLote'>
  >;
  let configuracionComparacionHistoricaService: jest.Mocked<
    Partial<ConfiguracionComparacionHistoricaService>
  >;
  let auditLogService: jest.Mocked<
    Pick<AuditLogService, 'getTrazabilidad' | 'getTrazabilidadBatch'>
  >;

  const mockTenant: TenantContext = {
    empresaId: 1,
    rolNombre: null,
  };

  const mockQueryBuilder = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    distinctOn: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    loteRepository = createMockLoteRepository();
    proveedorRepository = createMockRepository();
    configParametroRepository = createMockRepository();
    sensorLecturaRepository = createMockRepository();
    loteRevisionRepository = createMockRepository();

    sensorService = {
      findAll: jest.fn().mockResolvedValue([]),
    };

    clasificacionLoteService = {
      evaluarYClasificar: jest.fn().mockResolvedValue(undefined),
      historialDeLote: jest.fn().mockResolvedValue([]),
    };

    configuracionComparacionHistoricaService = {
      getConfig: jest
        .fn()
        .mockResolvedValue({ cantidadRegistrosHistoricos: 5 }),
    };

    auditLogService = {
      getTrazabilidad: jest.fn().mockResolvedValue(undefined),
      getTrazabilidadBatch: jest.fn().mockResolvedValue(new Map()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoteService,
        {
          provide: LOTE_REPOSITORY,
          useValue: loteRepository,
        },
        {
          provide: getRepositoryToken(Proveedor),
          useValue: proveedorRepository,
        },
        {
          provide: getRepositoryToken(ConfiguracionParametro),
          useValue: configParametroRepository,
        },
        {
          provide: getRepositoryToken(SensorLectura),
          useValue: sensorLecturaRepository,
        },
        {
          provide: getRepositoryToken(LoteRevisionCalidad),
          useValue: loteRevisionRepository,
        },
        {
          provide: SensorService,
          useValue: sensorService,
        },
        {
          provide: ClasificacionLoteService,
          useValue: clasificacionLoteService,
        },
        {
          provide: ConfiguracionComparacionHistoricaService,
          useValue: configuracionComparacionHistoricaService,
        },
        {
          provide: AuditLogService,
          useValue: auditLogService,
        },
      ],
    }).compile();

    service = module.get<LoteService>(LoteService);

    sensorLecturaRepository.createQueryBuilder?.mockReturnValue(
      mockQueryBuilder as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create — creación de lotes', () => {
    const createDto: any = {
      proveedorId: 10,
      materiaPrima: 'LECHE_ENTERA',
      fechaIngreso: '2026-07-31T10:00:00Z',
      parametros: [
        {
          parametro: Parametro.TEMPERATURA,
          valor: 12,
        },
      ],
      ubicacionInicial: 'SILO_1',
    };

    it('cuando el tenant no especifica empresaId, debe lanzar BadRequestException', async () => {
      const tenantSinEmpresa = {} as TenantContext;

      await expect(
        service.create(createDto, tenantSinEmpresa),
      ).rejects.toThrow(BadRequestException);
    });

    it('cuando el proveedor no existe para la empresa del tenant, debe lanzar NotFoundException', async () => {
      proveedorRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(createDto, mockTenant),
      ).rejects.toThrow(NotFoundException);
    });

    it('cuando el proveedor está inactivo, debe lanzar BadRequestException', async () => {
      proveedorRepository.findOne.mockResolvedValue({
        id: 10,
        razonSocial: 'Lácteos SA',
        estado: 'INACTIVA' as EstadoProveedor,
      });

      await expect(
        service.create(createDto, mockTenant),
      ).rejects.toThrow(BadRequestException);
    });

    it('cuando ya existe un lote con el mismo código, debe lanzar ConflictException', async () => {
      proveedorRepository.findOne.mockResolvedValue({
        id: 10,
        estado: EstadoProveedor.ACTIVA,
      });

      configParametroRepository.findOne.mockResolvedValue(null);
      loteRepository.countByEmpresa.mockResolvedValue(0);
      loteRepository.findByCodigo.mockResolvedValue({
        id: 99,
        codigo: 'LOTE-1-00001',
      });

      await expect(
        service.create(createDto, mockTenant),
      ).rejects.toThrow(ConflictException);
    });

    it('cuando los datos son válidos, debe registrar el lote, evaluar clasificación y retornar dto con warnings si los hay', async () => {
      proveedorRepository.findOne.mockResolvedValue({
        id: 10,
        estado: EstadoProveedor.ACTIVA,
      });

      configParametroRepository.findOne.mockResolvedValue({
        umbralMin: 1,
        umbralMax: 5,
      });

      loteRepository.countByEmpresa.mockResolvedValue(0);
      loteRepository.findByCodigo.mockResolvedValue(null);

      const loteCreado = {
        id: 100,
        codigo: 'LOTE-1-00001',
        empresaId: 1,
        ubicacionInicial: 'SILO_1',
        estado: EstadoLote.REGISTRADO,
        fechaIngreso: new Date(),
        parametros: [],
      };

      loteRepository.create.mockReturnValue(loteCreado);
      loteRepository.save.mockResolvedValue(loteCreado);
      loteRepository.findById.mockResolvedValue(loteCreado);

      const resultado = await service.create(createDto, mockTenant);

      expect(
        clasificacionLoteService.evaluarYClasificar,
      ).toHaveBeenCalledWith(100, 1);

      expect(sensorService.findAll).toHaveBeenCalledWith(
        {
          ubicacion: 'SILO_1',
          estado: EstadoSensor.ACTIVO,
        },
        mockTenant,
      );

      expect(resultado.warnings?.length).toBeGreaterThan(0);
      expect(resultado.lote).toBeDefined();
    });

    it('cuando no se envía código explícito y la ubicación es nula, genera código autogenerado y no consulta sensores', async () => {
      const dtoSinCodigoNiUbicacion: any = {
        proveedorId: 10,
        materiaPrima: 'LECHE_ENTERA',
        fechaIngreso: '2026-07-31T10:00:00Z',
        parametros: [
          {
            parametro: Parametro.TEMPERATURA,
            valor: 4,
          },
        ],
      };

      proveedorRepository.findOne.mockResolvedValue({
        id: 10,
        estado: EstadoProveedor.ACTIVA,
      });

      configParametroRepository.findOne.mockResolvedValue({
        umbralMin: 2,
        umbralMax: 8,
      });

      loteRepository.countByEmpresa.mockResolvedValue(5);
      loteRepository.findByCodigo.mockResolvedValue(null);

      const loteCreado = {
        id: 101,
        codigo: 'LOTE-1-00006',
        empresaId: 1,
        ubicacionInicial: null,
        estado: EstadoLote.REGISTRADO,
        fechaIngreso: new Date(),
        parametros: [],
      };

      loteRepository.create.mockReturnValue(loteCreado);
      loteRepository.save.mockResolvedValue(loteCreado);
      loteRepository.findById.mockResolvedValue(loteCreado);

      const resultado = await service.create(
        dtoSinCodigoNiUbicacion,
        mockTenant,
      );

      expect(loteRepository.findByCodigo).toHaveBeenCalledWith(
        'LOTE-1-00006',
        1,
      );

      expect(sensorService.findAll).not.toHaveBeenCalled();
      expect(resultado.warnings).toEqual([]);
      expect(resultado.sensoresDisponibles).toEqual([]);
    });
  });

  describe('findAll — consulta paginada de lotes', () => {
    it('debe retornar datos paginados usando query provista', async () => {
      const query = {
        page: 2,
        limit: 10,
      } as any;

      const lotesMock = [
        {
          id: 1,
          fechaIngreso: new Date(),
          parametros: [],
        },
      ] as any;

      loteRepository.findAll.mockResolvedValue([lotesMock, 1]);

      const resultado = await service.findAll(query, mockTenant);

      expect(loteRepository.findAll).toHaveBeenCalledWith(query, 1);
      expect(resultado.page).toBe(2);
      expect(resultado.limit).toBe(10);
      expect(resultado.total).toBe(1);
    });

    it('debe aplicar paginación por defecto si no se indican valores en la query', async () => {
      const query = {} as any;

      loteRepository.findAll.mockResolvedValue([[], 0]);

      const resultado = await service.findAll(query, mockTenant);

      expect(resultado.page).toBe(1);
      expect(resultado.limit).toBe(20);
    });

    it('cuando el usuario es GERENTE, debe incluir la trazabilidad de auditoría', async () => {
      const tenantGerente: TenantContext = {
        empresaId: 1,
        rolNombre: ROLES.GERENTE,
      };

      const lotesMock = [
        {
          id: 1,
          fechaIngreso: new Date(),
          parametros: [],
        },
        {
          id: 2,
          fechaIngreso: new Date(),
          parametros: [],
        },
      ] as any;

      const auditoria = new Map<number, any>([
        [1, { creadoPor: 'usuario-1' }],
        [2, { creadoPor: 'usuario-2' }],
      ]);

      loteRepository.findAll.mockResolvedValue([lotesMock, 2]);
      auditLogService.getTrazabilidadBatch.mockResolvedValue(auditoria);

      const resultado = await service.findAll({}, tenantGerente);

      expect(
        auditLogService.getTrazabilidadBatch,
      ).toHaveBeenCalledWith(
        'Lote',
        [1, 2],
        1,
      );

      expect(resultado.data[0].auditoria).toEqual({
        creadoPor: 'usuario-1',
      });

      expect(resultado.data[1].auditoria).toEqual({
        creadoPor: 'usuario-2',
      });
    });

    it('cuando el usuario no es GERENTE, no debe consultar la trazabilidad de auditoría', async () => {
      loteRepository.findAll.mockResolvedValue([
        [
          {
            id: 1,
            fechaIngreso: new Date(),
            parametros: [],
          },
        ],
        1,
      ]);

      await service.findAll({}, mockTenant);

      expect(
        auditLogService.getTrazabilidadBatch,
      ).not.toHaveBeenCalled();
    });
  });

  describe('findOne — obtención de lote por ID', () => {
    it('cuando el lote existe, debe retornar el DTO correspondiente', async () => {
      loteRepository.findById.mockResolvedValue({
        id: 10,
        fechaIngreso: new Date(),
        parametros: [],
      });

      const resultado = await service.findOne(10, mockTenant);

      expect(loteRepository.findById).toHaveBeenCalledWith(10, 1);
      expect(resultado.id).toBe(10);
    });

    it('cuando el lote no existe, debe lanzar NotFoundException', async () => {
      loteRepository.findById.mockResolvedValue(null);

      await expect(
        service.findOne(999, mockTenant),
      ).rejects.toThrow(NotFoundException);
    });

    it('cuando el usuario es GERENTE, debe incluir la trazabilidad de auditoría', async () => {
      const tenantGerente: TenantContext = {
        empresaId: 1,
        rolNombre: ROLES.GERENTE,
      };

      const lotesMock = [
        {
          id: 1,
          fechaIngreso: new Date(),
          parametros: [],
        },
        {
          id: 2,
          fechaIngreso: new Date(),
          parametros: [],
        },
      ] as any;

      const auditoria = new Map<number, any>([
        [1, { creadoPor: 'usuario-1' }],
        [2, { creadoPor: 'usuario-2' }],
      ]);

      loteRepository.findAll.mockResolvedValue([lotesMock, 2]);
      auditLogService.getTrazabilidadBatch.mockResolvedValue(auditoria);

      const resultado = await service.findAll({}, tenantGerente);

      expect(
        auditLogService.getTrazabilidadBatch,
      ).toHaveBeenCalledWith(
        'Lote',
        [1, 2],
        1,
      );

      expect(resultado.data[0].auditoria).toEqual({
        creadoPor: 'usuario-1',
      });

      expect(resultado.data[1].auditoria).toEqual({
        creadoPor: 'usuario-2',
      });
    });

    it('cuando el usuario no es GERENTE, no debe consultar la trazabilidad de auditoría', async () => {
      loteRepository.findById.mockResolvedValue({
        id: 10,
        fechaIngreso: new Date(),
        parametros: [],
      });

      await service.findOne(10, mockTenant);

      expect(
        auditLogService.getTrazabilidad,
      ).not.toHaveBeenCalled();
    });
  });

  describe('update — actualización de lote', () => {
    it('cuando el lote no existe, debe lanzar NotFoundException', async () => {
      loteRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(999, {}, mockTenant),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe actualizar los campos especificados y guardar el lote', async () => {
      const loteExistente = {
        id: 10,
        materiaPrima: 'LECHE_DESCREMADA',
        fechaIngreso: new Date('2026-01-01'),
        clasificacion: ClasificacionLote.APTO,
        destinoInicial: 'DEPOSITO_A',
        parametros: [],
      };

      loteRepository.findById.mockResolvedValue(loteExistente);

      loteRepository.save.mockImplementation((entidad) =>
        Promise.resolve(entidad),
      );

      const updateDto = {
        clasificacion: ClasificacionLote.NO_APTO,
        destinoInicial: DestinoLote.ALMACENAMIENTO,
        fechaIngreso: '2026-07-31T00:00:00Z',
      };

      const resultado = await service.update(
        10,
        updateDto,
        mockTenant,
      );

      expect(loteRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          clasificacion: ClasificacionLote.NO_APTO,
          destinoInicial: DestinoLote.ALMACENAMIENTO,
        }),
      );

      expect(resultado).toBeDefined();
    });
  });

  describe('finalizar — cierre de lote', () => {
    const finalizarDto = {
      rendimiento: 85,
      unidadRendimiento: 'PORCENTAJE',
    } as any;

    it('cuando el lote no existe, debe lanzar NotFoundException', async () => {
      loteRepository.findById.mockResolvedValue(null);

      await expect(
        service.finalizar(999, finalizarDto, mockTenant),
      ).rejects.toThrow(NotFoundException);
    });

    it('cuando el lote ya está finalizado, debe lanzar BadRequestException', async () => {
      loteRepository.findById.mockResolvedValue({
        id: 10,
        estado: EstadoLote.FINALIZADO,
        fechaIngreso: new Date(),
        parametros: [],
      });

      await expect(
        service.finalizar(10, finalizarDto, mockTenant),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe cambiar el estado del lote a FINALIZADO y guardarlo', async () => {
      const loteExistente: any = {
        id: 10,
        estado: EstadoLote.EN_PROCESO,
        fechaIngreso: new Date(),
        parametros: [],
      };

      loteRepository.findById.mockResolvedValue(loteExistente);

      loteRepository.save.mockImplementation((entidad) =>
        Promise.resolve(entidad),
      );

      const resultado = await service.finalizar(
        10,
        {} as any,
        mockTenant,
      );

      expect(loteExistente.estado).toBe(
        EstadoLote.FINALIZADO,
      );

      expect(loteRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: EstadoLote.FINALIZADO,
        }),
      );

      expect(resultado).toBeDefined();
    });

    it('debe guardar el rendimiento y su unidad cuando se informan al finalizar', async () => {
      const loteExistente: any = {
        id: 10,
        estado: EstadoLote.EN_PROCESO,
        fechaIngreso: new Date(),
        parametros: [],
      };

      const dto = {
        rendimiento: 85,
        unidadRendimiento: 'PORCENTAJE',
      } as any;

      loteRepository.findById.mockResolvedValue(loteExistente);

      loteRepository.save.mockImplementation((entidad) =>
        Promise.resolve(entidad),
      );

      await service.finalizar(10, dto, mockTenant);

      expect(loteExistente.estado).toBe(
        EstadoLote.FINALIZADO,
      );

      expect(loteExistente.rendimiento).toBe(85);
      expect(loteExistente.unidadRendimiento).toBe(
        'PORCENTAJE',
      );

      expect(loteRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: EstadoLote.FINALIZADO,
          rendimiento: 85,
          unidadRendimiento: 'PORCENTAJE',
        }),
      );
    });

    it('cuando se informa rendimiento sin unidad, debe guardar la unidad como null', async () => {
      const loteExistente: any = {
        id: 10,
        estado: EstadoLote.EN_PROCESO,
        fechaIngreso: new Date(),
        parametros: [],
      };

      const dto = {
        rendimiento: 80,
      } as any;

      loteRepository.findById.mockResolvedValue(loteExistente);

      loteRepository.save.mockImplementation((entidad) =>
        Promise.resolve(entidad),
      );

      await service.finalizar(10, dto, mockTenant);

      expect(loteExistente.estado).toBe(
        EstadoLote.FINALIZADO,
      );

      expect(loteExistente.rendimiento).toBe(80);
      expect(loteExistente.unidadRendimiento).toBeNull();
    });

  describe('getMetricasCalidad — monitoreo de métricas', () => {
    it('cuando el lote no existe, debe lanzar NotFoundException', async () => {
      loteRepository.findById.mockResolvedValue(null);

      await expect(
        service.getMetricasCalidad(100, mockTenant),
      ).rejects.toThrow(NotFoundException);
    });

    it('cuando el lote no está EN_PROCESO, debe indicar enProceso: false', async () => {
      loteRepository.findById.mockResolvedValue({
        id: 100,
        estado: EstadoLote.REGISTRADO,
      });

      const resultado = await service.getMetricasCalidad(
        100,
        mockTenant,
      );

      expect(resultado).toEqual({
        enProceso: false,
      });
    });

    it('cuando el lote está EN_PROCESO, debe armar las métricas calculando fueras de rango', async () => {
      loteRepository.findById.mockResolvedValue({
        id: 100,
        estado: EstadoLote.EN_PROCESO,
        materiaPrima: 'LECHE_ENTERA',
      });

      const fecha = new Date();

      mockQueryBuilder.getMany.mockResolvedValue([
        {
          valor: 20,
          timestampLectura: fecha,
          sensor: {
            parametro: 'HUMEDAD' as Parametro,
          },
        },
      ]);

      configParametroRepository.findOne.mockResolvedValue({
        umbralMin: 10,
        umbralMax: 15,
      });

      const resultado = await service.getMetricasCalidad(
        100,
        mockTenant,
      );

      expect(resultado.enProceso).toBe(true);
      expect(resultado.parametros).toBeDefined();
      expect(resultado.parametros).toHaveLength(1);
      expect(
        resultado.parametros?.[0]?.fueraDeRango,
      ).toBe(true);
    });

    it('debe marcar fueraDeRango en false si el valor está dentro de los umbrales o si no hay configuración', async () => {
      loteRepository.findById.mockResolvedValue({
        id: 100,
        estado: EstadoLote.EN_PROCESO,
        materiaPrima: 'LECHE_ENTERA',
      });

      mockQueryBuilder.getMany.mockResolvedValue([
        {
          valor: 12,
          timestampLectura: new Date(),
          sensor: {
            parametro: 'HUMEDAD' as Parametro,
          },
        },
        {
          valor: 5,
          timestampLectura: new Date(),
          sensor: {
            parametro: 'GRASA' as Parametro,
          },
        },
      ]);

      configParametroRepository.findOne
        .mockResolvedValueOnce({
          umbralMin: 10,
          umbralMax: 15,
        })
        .mockResolvedValueOnce(null);

      const resultado = await service.getMetricasCalidad(
        100,
        mockTenant,
      );

      expect(
        resultado.parametros?.[0]?.fueraDeRango,
      ).toBe(false);

      expect(
        resultado.parametros?.[1]?.fueraDeRango,
      ).toBe(false);

      expect(
        resultado.parametros?.[1]?.umbralMin,
      ).toBeNull();
    });
  });

  describe('getHistorialClasificaciones — historial de clasificaciones', () => {
    it('cuando el lote no existe, debe lanzar NotFoundException', async () => {
      loteRepository.findById.mockResolvedValue(null);

      await expect(
        service.getHistorialClasificaciones(999, mockTenant),
      ).rejects.toThrow(NotFoundException);
    });

    it('cuando el lote existe, debe delegar al ClasificacionLoteService', async () => {
      loteRepository.findById.mockResolvedValue({
        id: 10,
      });

      clasificacionLoteService.historialDeLote.mockResolvedValue([
        { id: 1 },
      ] as any);

      const resultado =
        await service.getHistorialClasificaciones(
          10,
          mockTenant,
        );

      expect(
        clasificacionLoteService.historialDeLote,
      ).toHaveBeenCalledWith(10, 1);

      expect(resultado).toHaveLength(1);
    });
  });

  describe('findNoAptos — listado de lotes no aptos', () => {
    it('debe obtener lotes no aptos sin revisión vigente y mapearlos', async () => {
      const mockLotes = [
        {
          id: 1,
          fechaIngreso: new Date(),
          parametros: [],
        },
      ] as any;

      loteRepository.findNoAptosSinRevisionVigente.mockResolvedValue(
        mockLotes,
      );

      const resultado = await service.findNoAptos(mockTenant);

      expect(
        loteRepository.findNoAptosSinRevisionVigente,
      ).toHaveBeenCalledWith(1);

      expect(resultado).toHaveLength(1);
    });
  });

  describe('revisarLote — gestión de calidad y revisiones', () => {
    const revisarDto = {
      decision: DecisionRevision.APROBADO,
      justificacion: 'Aprobado bajo supervisión de calidad',
    };

    it('cuando el lote no existe, debe lanzar NotFoundException', async () => {
      loteRepository.findById.mockResolvedValue(null);

      await expect(
        service.revisarLote(
          999,
          revisarDto,
          mockTenant,
          5,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('cuando el lote no está en clasificación NO_APTO, debe lanzar BadRequestException', async () => {
      loteRepository.findById.mockResolvedValue({
        id: 100,
        clasificacion: ClasificacionLote.APTO,
      });

      await expect(
        service.revisarLote(
          100,
          revisarDto,
          mockTenant,
          5,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('cuando el lote ya tiene una revisión vigente posterior a la clasificación, debe lanzar ConflictException', async () => {
      const fechaClasificacion = new Date(
        '2026-07-31T10:00:00Z',
      );

      const fechaRevisionAnterior = new Date(
        '2026-07-31T10:05:00Z',
      );

      loteRepository.findById.mockResolvedValue({
        id: 100,
        clasificacion: ClasificacionLote.NO_APTO,
      });

      clasificacionLoteService.historialDeLote.mockResolvedValue([
        {
          createdAt: fechaClasificacion,
        } as any,
      ]);

      loteRevisionRepository.findOne.mockResolvedValue({
        createdAt: fechaRevisionAnterior,
      } as any);

      await expect(
        service.revisarLote(
          100,
          revisarDto,
          mockTenant,
          5,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('cuando existe una revisión pero NO hay historial de clasificación previa, debe considerar la revisión vigente y lanzar ConflictException', async () => {
      loteRepository.findById.mockResolvedValue({
        id: 100,
        clasificacion: ClasificacionLote.NO_APTO,
      });

      clasificacionLoteService.historialDeLote.mockResolvedValue([]);

      loteRevisionRepository.findOne.mockResolvedValue({
        createdAt: new Date(),
      } as any);

      await expect(
        service.revisarLote(
          100,
          revisarDto,
          mockTenant,
          5,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('cuando la clasificación es posterior a la última revisión, debe permitir la nueva revisión', async () => {
      const fechaRevisionAnterior = new Date(
        '2026-07-31T09:00:00Z',
      );

      const fechaClasificacionNuevas = new Date(
        '2026-07-31T10:00:00Z',
      );

      const lote = {
        id: 100,
        clasificacion: ClasificacionLote.NO_APTO,
        estado: EstadoLote.EN_PROCESO,
        fechaIngreso: new Date(),
        parametros: [],
      };

      loteRepository.findById.mockResolvedValue(lote);

      clasificacionLoteService.historialDeLote.mockResolvedValue([
        {
          createdAt: fechaClasificacionNuevas,
        } as any,
      ]);

      loteRevisionRepository.findOne.mockResolvedValue({
        createdAt: fechaRevisionAnterior,
      } as any);

      loteRevisionRepository.create.mockImplementation(
        (dto) => dto,
      );

      loteRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      await service.revisarLote(
        100,
        revisarDto,
        mockTenant,
        5,
      );

      expect(lote.clasificacion).toBe(
        ClasificacionLote.APTO,
      );
    });

    it('cuando la decisión es APROBADO, el lote debe pasar a clasificación APTO', async () => {
      const lote = {
        id: 100,
        clasificacion: ClasificacionLote.NO_APTO,
        estado: EstadoLote.EN_PROCESO,
        fechaIngreso: new Date(),
        parametros: [],
      };

      loteRepository.findById.mockResolvedValue(lote);

      clasificacionLoteService.historialDeLote.mockResolvedValue([]);

      loteRevisionRepository.findOne.mockResolvedValue(null);

      loteRevisionRepository.create.mockImplementation(
        (dto) => dto,
      );

      loteRevisionRepository.save.mockResolvedValue(
        undefined,
      );

      loteRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      await service.revisarLote(
        100,
        revisarDto,
        mockTenant,
        5,
      );

      expect(lote.clasificacion).toBe(
        ClasificacionLote.APTO,
      );

      expect(
        loteRevisionRepository.save,
      ).toHaveBeenCalled();
    });

    it('cuando la decisión es RECHAZADO, el lote debe pasar a estado RECHAZADO', async () => {
      const lote = {
        id: 100,
        clasificacion: ClasificacionLote.NO_APTO,
        estado: EstadoLote.EN_PROCESO,
        fechaIngreso: new Date(),
        parametros: [],
      };

      const revisarRechazadoDto = {
        decision: DecisionRevision.RECHAZADO,
        justificacion:
          'Parámetros fuera de norma irreversibles',
      };

      loteRepository.findById.mockResolvedValue(lote);

      clasificacionLoteService.historialDeLote.mockResolvedValue([]);

      loteRevisionRepository.findOne.mockResolvedValue(null);

      loteRevisionRepository.create.mockImplementation(
        (dto) => dto,
      );

      loteRevisionRepository.save.mockResolvedValue(
        undefined,
      );

      loteRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      await service.revisarLote(
        100,
        revisarRechazadoDto,
        mockTenant,
        5,
      );

      expect(lote.estado).toBe(
        EstadoLote.RECHAZADO,
      );

      expect(
        loteRevisionRepository.save,
      ).toHaveBeenCalled();
    });
  });

  describe('getHistorialRevisiones — historial de revisiones', () => {
    it('cuando el lote no existe, debe lanzar NotFoundException', async () => {
      loteRepository.findById.mockResolvedValue(null);

      await expect(
        service.getHistorialRevisiones(
          999,
          mockTenant,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('cuando el lote existe, debe retornar sus revisiones ordenadas descendentemente', async () => {
      loteRepository.findById.mockResolvedValue({
        id: 10,
      });

      loteRevisionRepository.find.mockResolvedValue([
        {
          id: 1,
        },
      ] as any);

      const resultado =
        await service.getHistorialRevisiones(
          10,
          mockTenant,
        );

      expect(
        loteRevisionRepository.find,
      ).toHaveBeenCalledWith({
        where: {
          loteId: 10,
          empresaId: 1,
        },
        order: {
          createdAt: 'DESC',
        },
      });

      expect(resultado).toHaveLength(1);
    });
  });

  describe('compararConHistorico — comparación de tendencias', () => {
    it('cuando el lote no existe, debe lanzar NotFoundException', async () => {
      loteRepository.findById.mockResolvedValue(null);

      await expect(
        service.compararConHistorico(
          999,
          mockTenant,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe obtener la configuración histórica y consultar únicamente los últimos lotes aptos excluyendo el lote actual', async () => {
      const loteActual = {
        id: 100,
        materiaPrima: 'LECHE_ENTERA',
        parametros: [],
      };

      loteRepository.findById.mockResolvedValue(
        loteActual,
      );

      loteRepository.findUltimosAptos.mockResolvedValue([]);

      await service.compararConHistorico(
        100,
        mockTenant,
      );

      expect(
        configuracionComparacionHistoricaService.getConfig,
      ).toHaveBeenCalledWith(1);

      expect(
        loteRepository.findUltimosAptos,
      ).toHaveBeenCalledWith(
        1,
        'LECHE_ENTERA',
        5,
        100,
      );
    });
  });
});
})
