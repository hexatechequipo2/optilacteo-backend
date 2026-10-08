import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoteService } from '../lote.service';
import { LOTE_REPOSITORY } from '../repository/lote-repository.interface';
import { Proveedor } from '../../proveedores/entities/proveedor.entity';
import { Tambo } from '../../tambo/entities/tambo.entity';
import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { SensorLectura } from '../../lectura-sensor/entities/sensor-lectura.entity';
import { SensorService } from '../../sensor/sensor.service';
import { ClasificacionLoteService } from '../clasificacion-lote.service';
import { LoteRevisionCalidad } from '../entities/lote-revision-calidad.entity';
import { LoteDestinoHistorial } from '../entities/lote-destino-historial.entity';
import { DestinoProductivo } from '../../destino-productivo/entities/destino-productivo.entity';
import { ConfiguracionComparacionHistoricaService } from '../../config-parametro/configuracion-comparacion-historica.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { MlService } from '../../ml/ml.service';
import { EstabilidadProveedorService } from '../../estabilidad-proveedor/estabilidad-proveedor.service';
import type { CreateLoteDto } from '../dto/create-lote.dto';
import { EstadoProveedor } from '../../proveedores/enums/estado-proveedor.enum';
import { EstadoLote } from '../enums/estado-lote.enum';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { ClasificacionLote } from '../enums/clasificacion-lote.enum';
import { DecisionRevision } from '../enums/decision-revision.enum';
import { ROLES } from '../../rol/constants/roles.constants';
import type { TenantContext } from '../../../common/types/tenant-context.type';

describe('LoteService', () => {
  let service: LoteService;

  const mockLoteRepository = {
    findByCodigo: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    countByEmpresa: jest.fn(),
    findNoAptosSinRevisionVigente: jest.fn(),
    findUltimosAptos: jest.fn(),
    findConDesvioByProveedor: jest.fn(),
  };

  const mockProveedorRepository = {
    findOne: jest.fn(),
  };

  const mockTamboRepository = {
    findOne: jest.fn(),
  };

  const mockConfigParametroRepository = {
    findOne: jest.fn(),
  };

  const mockSensorLecturaRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockSensorService = {
    findAll: jest.fn(),
  };

  const mockClasificacionLoteService = {
    evaluarYClasificar: jest.fn(),
    historialDeLote: jest.fn(),
  };

  const mockLoteRevisionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockLoteDestinoHistorialRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockDestinoProductivoRepository = {
    findOne: jest.fn(),
  };

  const mockConfiguracionComparacionHistoricaService = {
    getConfig: jest.fn(),
  };

  const mockAuditLogService = {
    getTrazabilidad: jest.fn(),
    getTrazabilidadBatch: jest.fn(),
  };

  const mockMlService = {
    generarRecomendacion: jest.fn(),
  };

  const mockEstabilidadProveedorService = {
    recalcularBestEffort: jest.fn(),
  };

  const tenantMock: TenantContext = {
    empresaId: 1,
    rolNombre: ROLES.OPERARIO_LINEA,
  };

  const tenantGerenteMock: TenantContext = {
    empresaId: 1,
    rolNombre: ROLES.GERENTE,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoteService,
        {
          provide: LOTE_REPOSITORY,
          useValue: mockLoteRepository,
        },
        {
          provide: getRepositoryToken(Proveedor),
          useValue: mockProveedorRepository,
        },
        {
          provide: getRepositoryToken(Tambo),
          useValue: mockTamboRepository,
        },
        {
          provide: getRepositoryToken(ConfiguracionParametro),
          useValue: mockConfigParametroRepository,
        },
        {
          provide: getRepositoryToken(SensorLectura),
          useValue: mockSensorLecturaRepository,
        },
        {
          provide: SensorService,
          useValue: mockSensorService,
        },
        {
          provide: ClasificacionLoteService,
          useValue: mockClasificacionLoteService,
        },
        {
          provide: getRepositoryToken(LoteRevisionCalidad),
          useValue: mockLoteRevisionRepository,
        },
        {
          provide: getRepositoryToken(LoteDestinoHistorial),
          useValue: mockLoteDestinoHistorialRepository,
        },
        {
          provide: getRepositoryToken(DestinoProductivo),
          useValue: mockDestinoProductivoRepository,
        },
        {
          provide: ConfiguracionComparacionHistoricaService,
          useValue: mockConfiguracionComparacionHistoricaService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: MlService,
          useValue: mockMlService,
        },
        {
          provide: EstabilidadProveedorService,
          useValue: mockEstabilidadProveedorService,
        },
      ],
    }).compile();

    service = module.get<LoteService>(LoteService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveEmpresaId (validación de tenant)', () => {
    it('debe lanzar BadRequestException si tenant.empresaId es nulo/indefinido', async () => {
      await expect(service.findOne(1, {} as TenantContext)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('create', () => {
    const createDto: CreateLoteDto = {
      proveedorId: 10,
      tamboId: 20,
      materiaPrima: TipoMateriaPrima.LECHE_CRUDA,
      fechaIngreso: '2026-08-01T08:00:00Z',
      cantidad: 1000,
      numeroRemito: 'R-001',
      ubicacionInicial: 'Silo 1' as CreateLoteDto['ubicacionInicial'],
      parametros: [
        { parametro: Parametro.GRASA, valor: 3.5 },
      ],
    };

    it('debe lanzar NotFoundException si el proveedor no existe', async () => {
      mockProveedorRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, tenantMock)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar BadRequestException si el proveedor no está activo', async () => {
      mockProveedorRepository.findOne.mockResolvedValue({
        id: 10,
        estado: 'INACTIVA' as EstadoProveedor,
        razonSocial: 'Proveedor X',
      });

      await expect(service.create(createDto, tenantMock)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar NotFoundException si el tambo no existe', async () => {
      mockProveedorRepository.findOne.mockResolvedValue({
        id: 10,
        estado: EstadoProveedor.ACTIVA,
      });
      mockTamboRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, tenantMock)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar BadRequestException si el tambo no pertenece al proveedor', async () => {
      mockProveedorRepository.findOne.mockResolvedValue({
        id: 10,
        estado: EstadoProveedor.ACTIVA,
        razonSocial: 'Proveedor X',
      });
      mockTamboRepository.findOne.mockResolvedValue({
        id: 20,
        proveedorId: 99,
        nombre: 'Tambo Y',
        activo: true,
      });

      await expect(service.create(createDto, tenantMock)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar BadRequestException si el tambo está inactivo', async () => {
      mockProveedorRepository.findOne.mockResolvedValue({
        id: 10,
        estado: EstadoProveedor.ACTIVA,
      });
      mockTamboRepository.findOne.mockResolvedValue({
        id: 20,
        proveedorId: 10,
        nombre: 'Tambo Y',
        activo: false,
      });

      await expect(service.create(createDto, tenantMock)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar ConflictException si el código de lote ya existe', async () => {
      mockProveedorRepository.findOne.mockResolvedValue({
        id: 10,
        estado: EstadoProveedor.ACTIVA,
      });
      mockTamboRepository.findOne.mockResolvedValue({
        id: 20,
        proveedorId: 10,
        activo: true,
      });
      mockConfigParametroRepository.findOne.mockResolvedValue({
        umbralMin: 3.0,
        umbralMax: 4.0,
      });
      mockLoteRepository.findByCodigo.mockResolvedValue({ id: 1 });

      await expect(
        service.create({ ...createDto, codigo: 'LOTE-EX' }, tenantMock),
      ).rejects.toThrow(ConflictException);
    });

    it('debe crear el lote correctamente y retornar respuesta con sensores y recomendación', async () => {
      mockProveedorRepository.findOne.mockResolvedValue({
        id: 10,
        estado: EstadoProveedor.ACTIVA,
      });
      mockTamboRepository.findOne.mockResolvedValue({
        id: 20,
        proveedorId: 10,
        activo: true,
      });
      mockConfigParametroRepository.findOne.mockResolvedValue({
        umbralMin: 3.0,
        umbralMax: 4.0,
      });
      mockLoteRepository.countByEmpresa.mockResolvedValue(0);
      mockLoteRepository.findByCodigo.mockResolvedValue(null);
      mockLoteRepository.create.mockImplementation((val) => val);
      mockLoteRepository.save.mockResolvedValue({ id: 100 });
      mockLoteRepository.findById.mockResolvedValue({
        id: 100,
        codigo: 'LOTE-1-00001',
        ubicacionInicial: 'Silo 1',
        fechaIngreso: new Date(),
        parametros: [],
      });
      mockSensorService.findAll.mockResolvedValue([{ id: 1, nombre: 'S-1' }]);
      mockMlService.generarRecomendacion.mockResolvedValue({
        id: 1,
        destinoRecomendadoId: 5,
        destinoRecomendado: {
          id: 5,
          nombre: 'Queso Cream',
        },
        confianza: 0.95,
        estado: 'PENDIENTE',
      });

      const res = await service.create(createDto, tenantMock);

      expect(res.lote.id).toBe(100);
      expect(res.sensoresDisponibles).toHaveLength(1);
      expect(res.recomendacion).not.toBeNull();
      expect(
        mockEstabilidadProveedorService.recalcularBestEffort,
      ).toHaveBeenCalledWith(10, 1);
      expect(
        mockClasificacionLoteService.evaluarYClasificar,
      ).toHaveBeenCalledWith(100, 1);
    });
  });

  describe('findAll', () => {
    it('debe retornar lista de lotes y total paginado', async () => {
      const lotes = [{ id: 1, fechaIngreso: new Date() }];
      mockLoteRepository.findAll.mockResolvedValue([lotes, 1]);

      const res = await service.findAll({ page: 1, limit: 10 }, tenantMock);

      expect(res.total).toBe(1);
      expect(res.data).toHaveLength(1);
      expect(mockAuditLogService.getTrazabilidadBatch).not.toHaveBeenCalled();
    });

    it('debe incluir información de auditoría si el tenant es GERENTE', async () => {
      const lotes = [{ id: 1, fechaIngreso: new Date() }];
      mockLoteRepository.findAll.mockResolvedValue([lotes, 1]);
      const mapAudit = new Map();
      mapAudit.set(1, [{ accion: 'CREATE' }]);
      mockAuditLogService.getTrazabilidadBatch.mockResolvedValue(mapAudit);

      const res = await service.findAll(
        { page: 1, limit: 10 },
        tenantGerenteMock,
      );

      expect(res.data[0].auditoria).toEqual([{ accion: 'CREATE' }]);
    });
  });

  describe('findOne', () => {
    it('debe lanzar NotFoundException si el lote no existe', async () => {
      mockLoteRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(99, tenantMock)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe retornar DTO del lote existente', async () => {
      mockLoteRepository.findById.mockResolvedValue({
        id: 1,
        fechaIngreso: new Date(),
      });

      const res = await service.findOne(1, tenantMock);
      expect(res.id).toBe(1);
    });
  });

  describe('update', () => {
    it('debe lanzar NotFoundException si el lote a actualizar no existe', async () => {
      mockLoteRepository.findById.mockResolvedValue(null);

      await expect(service.update(99, {}, tenantMock)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe actualizar los campos enviados', async () => {
      const lote = { id: 1, materiaPrima: TipoMateriaPrima.LECHE_CRUDA };
      mockLoteRepository.findById.mockResolvedValue(lote);
      mockLoteRepository.save.mockImplementation((val) => val);

      const res = await service.update(
        1,
        { materiaPrima: TipoMateriaPrima.CREMA_DE_LECHE },
        tenantMock,
      );

      expect(res.materiaPrima).toBe(TipoMateriaPrima.CREMA_DE_LECHE);
    });
  });

  describe('finalizar', () => {
    it('debe lanzar BadRequestException si ya está finalizado con rendimiento', async () => {
      mockLoteRepository.findById.mockResolvedValue({
        id: 1,
        estado: EstadoLote.FINALIZADO,
        rendimiento: 90,
      });

      await expect(service.finalizar(1, {}, tenantMock)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar BadRequestException si no tiene destino productivo asignado', async () => {
      mockLoteRepository.findById.mockResolvedValue({
        id: 1,
        estado: EstadoLote.EN_PROCESO,
        destinoProductivoId: null,
      });

      await expect(service.finalizar(1, {}, tenantMock)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe finalizar el lote y asignar rendimiento', async () => {
      const lote = {
        id: 1,
        estado: EstadoLote.EN_PROCESO,
        destinoProductivoId: 5,
      };
      mockLoteRepository.findById.mockResolvedValue(lote);
      mockLoteRepository.save.mockImplementation((val) => val);

      const res = await service.finalizar(
        1,
        { rendimiento: 95, unidadRendimiento: 'KG' as any },
        tenantMock,
      );

      expect(res.estado).toBe(EstadoLote.FINALIZADO);
      expect(res.rendimiento).toBe(95);
    });
  });

  describe('asignarDestinoProductivo', () => {
    it('debe lanzar BadRequestException si el lote está finalizado o rechazado', async () => {
      mockLoteRepository.findById.mockResolvedValue({
        id: 1,
        estado: EstadoLote.FINALIZADO,
      });

      await expect(
        service.asignarDestinoProductivo(
          1,
          { destinoProductivoId: 2 },
          tenantMock,
          10,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si el destino productivo no existe', async () => {
      mockLoteRepository.findById.mockResolvedValue({
        id: 1,
        estado: EstadoLote.REGISTRADO,
      });
      mockDestinoProductivoRepository.findOne.mockResolvedValue(null);

      await expect(
        service.asignarDestinoProductivo(
          1,
          { destinoProductivoId: 2 },
          tenantMock,
          10,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si el destino asignado es el mismo que ya tiene', async () => {
      mockLoteRepository.findById.mockResolvedValue({
        id: 1,
        estado: EstadoLote.REGISTRADO,
        destinoProductivoId: 2,
      });
      mockDestinoProductivoRepository.findOne.mockResolvedValue({
        id: 2,
        nombre: 'Queso',
      });

      await expect(
        service.asignarDestinoProductivo(
          1,
          { destinoProductivoId: 2 },
          tenantMock,
          10,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe cambiar el destino y guardar historial', async () => {
      const lote = {
        id: 1,
        estado: EstadoLote.EN_PROCESO,
        destinoProductivoId: 1,
        cantidadDisponible: 0,
      };
      const nuevoDestino = {
        id: 2,
        nombre: 'Mantecas',
      };

      mockLoteRepository.findById.mockResolvedValue(lote);
      mockDestinoProductivoRepository.findOne.mockResolvedValue(nuevoDestino);

      mockLoteRepository.save.mockImplementation(async (val) => ({
        ...lote,
        ...val,
        destinoProductivoId: 2,
        destinoProductivo: nuevoDestino,
      }));

      mockLoteDestinoHistorialRepository.create.mockImplementation((val) => val);
      mockLoteDestinoHistorialRepository.save.mockImplementation(async (val) => ({
        id: 100,
        loteId: 1,
        destinoProductivoId: 2,
        ...val,
      }));

      const res = await service.asignarDestinoProductivo(
        1,
        { destinoProductivoId: 2 },
        tenantMock,
        10,
      );

      expect(res).toBeDefined();
      expect(mockLoteDestinoHistorialRepository.save).toHaveBeenCalled();
    });
  });

  describe('getMetricasCalidad', () => {
    it('debe retornar enProceso = false si el lote no está EN_PROCESO', async () => {
      mockLoteRepository.findById.mockResolvedValue({
        id: 1,
        estado: EstadoLote.REGISTRADO,
      });

      const res = await service.getMetricasCalidad(1, tenantMock);
      expect(res.enProceso).toBe(false);
    });

    it('debe calcular métricas fuera de rango si el lote está EN_PROCESO', async () => {
      mockLoteRepository.findById.mockResolvedValue({
        id: 1,
        estado: EstadoLote.EN_PROCESO,
        materiaPrima: TipoMateriaPrima.LECHE_CRUDA,
      });

      const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        distinctOn: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            valor: 15,
            timestampLectura: new Date(),
            sensor: { parametro: 'TEMPERATURA' },
          },
        ]),
      };
      mockSensorLecturaRepository.createQueryBuilder.mockReturnValue(qb);

      mockConfigParametroRepository.findOne.mockResolvedValue({
        umbralMin: 2,
        umbralMax: 8,
      });

      const res = await service.getMetricasCalidad(1, tenantMock);

      expect(res.enProceso).toBe(true);
      expect(res.parametros?.[0].fueraDeRango).toBe(true);
    });
  });

  describe('revisarLote', () => {
    it('debe lanzar BadRequestException si el lote no está en ClasificacionLote.NO_APTO', async () => {
      mockLoteRepository.findById.mockResolvedValue({
        id: 1,
        clasificacion: ClasificacionLote.APTO,
      });

      await expect(
        service.revisarLote(
          1,
          { decision: DecisionRevision.APROBADO, justificacion: 'Ok' },
          tenantMock,
          10,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar ConflictException si ya tiene una revisión vigente posterior a la última clasificación', async () => {
      mockLoteRepository.findById.mockResolvedValue({
        id: 1,
        clasificacion: ClasificacionLote.NO_APTO,
      });
      mockClasificacionLoteService.historialDeLote.mockResolvedValue([
        { createdAt: new Date('2026-08-01') },
      ]);
      mockLoteRevisionRepository.findOne.mockResolvedValue({
        createdAt: new Date('2026-08-02'),
      });

      await expect(
        service.revisarLote(
          1,
          { decision: DecisionRevision.APROBADO, justificacion: 'Ok' },
          tenantMock,
          10,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('debe aprobar la revisión y cambiar la clasificación del lote a APTO', async () => {
      const lote = { id: 1, clasificacion: ClasificacionLote.NO_APTO };
      mockLoteRepository.findById.mockResolvedValue(lote);
      mockClasificacionLoteService.historialDeLote.mockResolvedValue([]);
      mockLoteRevisionRepository.findOne.mockResolvedValue(null);
      mockLoteRevisionRepository.create.mockImplementation((val) => val);
      mockLoteRepository.save.mockImplementation((val) => val);

      const res = await service.revisarLote(
        1,
        { decision: DecisionRevision.APROBADO, justificacion: 'Cumple' },
        tenantMock,
        10,
      );

      expect(res.clasificacion).toBe(ClasificacionLote.APTO);
    });

    it('debe rechazar la revisión y cambiar el estado a RECHAZADO', async () => {
      const lote = { id: 1, clasificacion: ClasificacionLote.NO_APTO };
      mockLoteRepository.findById.mockResolvedValue(lote);
      mockClasificacionLoteService.historialDeLote.mockResolvedValue([]);
      mockLoteRevisionRepository.findOne.mockResolvedValue(null);
      mockLoteRevisionRepository.create.mockImplementation((val) => val);
      mockLoteRepository.save.mockImplementation((val) => val);

      const res = await service.revisarLote(
        1,
        { decision: DecisionRevision.RECHAZADO, justificacion: 'Mal' },
        tenantMock,
        10,
      );

      expect(res.estado).toBe(EstadoLote.RECHAZADO);
    });
  });

  describe('compararConHistorico', () => {
    it('debe realizar la comparación con los lotes históricos aptos', async () => {
      const lote = { id: 1, materiaPrima: TipoMateriaPrima.LECHE_CRUDA, parametros: [] };
      mockLoteRepository.findById.mockResolvedValue(lote);
      mockConfiguracionComparacionHistoricaService.getConfig.mockResolvedValue(
        {
          cantidadRegistrosHistoricos: 5,
        },
      );
      mockLoteRepository.findUltimosAptos.mockResolvedValue([]);

      const res = await service.compararConHistorico(1, tenantMock);

      expect(res).toBeDefined();
      expect(mockLoteRepository.findUltimosAptos).toHaveBeenCalledWith(
        1,
        TipoMateriaPrima.LECHE_CRUDA,
        5,
        1,
      );
    });
  });

  describe('getDesviosPorProveedor', () => {
    it('debe lanzar NotFoundException si el proveedor no existe', async () => {
      mockProveedorRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getDesviosPorProveedor(99, tenantMock),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe retornar los desvíos calculados para el proveedor', async () => {
      mockProveedorRepository.findOne.mockResolvedValue({ id: 10 });
      mockLoteRepository.findConDesvioByProveedor.mockResolvedValue([
        {
          id: 1,
          cantidad: 100,
          cantidadComprometidaKg: 120,
          parametros: [],
        },
      ]);

      const res = await service.getDesviosPorProveedor(10, tenantMock);

      expect(res).toHaveLength(1);
    });
  });
});