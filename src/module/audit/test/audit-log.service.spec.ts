import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AuditLogService } from '../audit-log.service';
import { AUDIT_LOG_REPOSITORY } from '../repository/audit-log-interface.repository';
import { AuditLog } from '../entity/audit-log.entity';
import type { TenantContext } from '../../../common/types/tenant-context.type';
import type { QueryAuditLogDto } from '../dto/query-audit-log.dto';

describe('AuditLogService', () => {
  let service: AuditLogService;

  const mockAuditLogRepository = {
    create: jest.fn(),
    findFiltered: jest.fn(),
    findAllMatching: jest.fn(),
    findPrimerosYUltimos: jest.fn(),
  };

  const tenantMock: TenantContext = { empresaId: 100 } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: AUDIT_LOG_REPOSITORY,
          useValue: mockAuditLogRepository,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('record', () => {
    it('debe registrar la auditoría invocando al repositorio', async () => {
      // Arrange
      const dataMock = {
        accion: 'CREAR',
        entidad: 'Lote',
        empresaId: 100,
      } as any;

      mockAuditLogRepository.create.mockResolvedValue(undefined);

      // Act
      await service.record(dataMock);

      // Assert
      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(dataMock);
    });

    it('no debe propagar el error y debe registrar un log de error si el repositorio falla', async () => {
      // Arrange
      const dataMock = {
        accion: 'CREAR',
        entidad: 'Lote',
      } as any;

      mockAuditLogRepository.create.mockRejectedValue(
        new Error('Error de conexión con la BD'),
      );
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      // Act & Assert
      await expect(service.record(dataMock)).resolves.not.toThrow();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('No se pudo registrar auditoría'),
      );
    });
  });

  describe('findAll', () => {
    it('debe calcular skip y limit correctamente y llamar a findFiltered', async () => {
      // Arrange
      const query: QueryAuditLogDto = {
        page: 2,
        limit: 10,
        fechaDesde: '2026-01-01',
      };

      const resultadoMock: [AuditLog[], number] = [[], 0];
      mockAuditLogRepository.findFiltered.mockResolvedValue(resultadoMock);

      // Act
      const resultado = await service.findAll(tenantMock, query);

      // Assert
      expect(mockAuditLogRepository.findFiltered).toHaveBeenCalledWith(
        tenantMock,
        expect.objectContaining({
          fechaDesde: new Date('2026-01-01'),
        }),
        10, // skip = (2-1)*10
        10, // limit
      );
      expect(resultado).toEqual(resultadoMock);
    });

    it('debe usar la paginación por defecto si no se especifican valores en la query', async () => {
      // Arrange
      mockAuditLogRepository.findFiltered.mockResolvedValue([[], 0]);

      // Act
      await service.findAll(tenantMock, {});

      // Assert
      expect(mockAuditLogRepository.findFiltered).toHaveBeenCalledWith(
        tenantMock,
        expect.any(Object),
        0, // skip
        50, // limit por defecto
      );
    });
  });

  describe('exportarCsv', () => {
    it('debe obtener los registros filtrados y formatearlos en un string CSV', async () => {
      // Arrange
      const fecha = new Date('2026-05-10T10:00:00.000Z');
      const registrosMock: AuditLog[] = [
        {
          id: 1,
          userId: 5,
          userEmail: 'user@test.com',
          userNombre: 'Juan Perez',
          userRol: 'ADMIN',
          empresaId: 100,
          accion: 'CREAR',
          entidad: 'Lote',
          entidadId: 42,
          tipo: 'CONFIGURACION',
          descripcion: 'Creación de lote "L-001"',
          createdAt: fecha,
        } as any,
      ];

      mockAuditLogRepository.findAllMatching.mockResolvedValue(registrosMock);

      // Act
      const csv = await service.exportarCsv(tenantMock, {});

      // Assert
      expect(mockAuditLogRepository.findAllMatching).toHaveBeenCalledWith(
        tenantMock,
        expect.any(Object),
      );
      expect(csv).toContain(
        'id,userId,userEmail,userNombre,userRol,empresaId,accion,entidad,entidadId,tipo,descripcion,createdAt',
      );
      expect(csv).toContain(
        '1,5,user@test.com,Juan Perez,ADMIN,100,CREAR,Lote,42,CONFIGURACION,"Creación de lote ""L-001""",2026-05-10T10:00:00.000Z',
      );
    });
  });

  describe('getTrazabilidadBatch / getTrazabilidad', () => {
    const empresaId = 100;
    const entidad = 'Lote';

    it('debe retornar un mapa vacío si el arreglo de entidadIds está vacío', async () => {
      const mapa = await service.getTrazabilidadBatch(entidad, [], empresaId);
      expect(mapa.size).toBe(0);
      expect(mockAuditLogRepository.findPrimerosYUltimos).not.toHaveBeenCalled();
    });

    it('debe construir la trazabilidad incluyendo creadoPor y ultimaModificacion si existen cambios posteriores', async () => {
      // Arrange
      const fechaCreacion = new Date('2026-01-01');
      const fechaModificacion = new Date('2026-02-01');

      const logsMock: AuditLog[] = [
        {
          id: 1,
          entidadId: 10,
          userId: 1,
          userEmail: 'creador@test.com',
          createdAt: fechaCreacion,
        } as any,
        {
          id: 2,
          entidadId: 10,
          userId: 2,
          userEmail: 'editor@test.com',
          createdAt: fechaModificacion,
        } as any,
      ];

      mockAuditLogRepository.findPrimerosYUltimos.mockResolvedValue(logsMock);

      // Act
      const trazabilidad = await service.getTrazabilidad(
        entidad,
        10,
        empresaId,
      );

      // Assert
      expect(trazabilidad).toEqual({
        creadoPor: {
          userId: 1,
          userEmail: 'creador@test.com',
          fecha: fechaCreacion,
        },
        ultimaModificacion: {
          userId: 2,
          userEmail: 'editor@test.com',
          fecha: fechaModificacion,
        },
      });
    });

    it('debe omitir ultimaModificacion si solo existe el registro de creación', async () => {
      // Arrange
      const fechaCreacion = new Date('2026-01-01');

      const logsMock: AuditLog[] = [
        {
          id: 1,
          entidadId: 10,
          userId: 1,
          userEmail: 'creador@test.com',
          createdAt: fechaCreacion,
        } as any,
      ];

      mockAuditLogRepository.findPrimerosYUltimos.mockResolvedValue(logsMock);

      // Act
      const trazabilidad = await service.getTrazabilidad(
        entidad,
        10,
        empresaId,
      );

      // Assert
      expect(trazabilidad.creadoPor).toEqual({
        userId: 1,
        userEmail: 'creador@test.com',
        fecha: fechaCreacion,
      });
      expect(trazabilidad.ultimaModificacion).toBeUndefined();
    });
  });
});