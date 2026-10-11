import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { RetencionArchivadoService } from '../retencion-archivado.service';
import { AuditLog } from '../../audit/entity/audit-log.entity';
import { Lote } from '../../lote/entities/lote.entity';
import { MedicionManualLote } from '../../medicion-manual/entities/medicion-manual-lote.entity';
import { SensorLectura } from '../../lectura-sensor/entities/sensor-lectura.entity';
import { PoliticaRetencionService } from '../politica-retencion.service';

describe('RetencionArchivadoService', () => {
  let service: RetencionArchivadoService;
  let politicaService: PoliticaRetencionService;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const createMockRepo = () => ({
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    find: jest.fn(),
    delete: jest.fn(),
  });

  const mockAuditLogRepo = createMockRepo();
  const mockLoteRepo = createMockRepo();
  const mockMedicionRepo = createMockRepo();
  const mockLecturaRepo = createMockRepo();

  const mockPoliticaRetencionService = {
    getRetencionMeses: jest.fn(),
    getDiasAviso: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetencionArchivadoService,
        { provide: getRepositoryToken(AuditLog), useValue: mockAuditLogRepo },
        { provide: getRepositoryToken(Lote), useValue: mockLoteRepo },
        {
          provide: getRepositoryToken(MedicionManualLote),
          useValue: mockMedicionRepo,
        },
        {
          provide: getRepositoryToken(SensorLectura),
          useValue: mockLecturaRepo,
        },
        {
          provide: PoliticaRetencionService,
          useValue: mockPoliticaRetencionService,
        },
      ],
    }).compile();

    service = module.get<RetencionArchivadoService>(RetencionArchivadoService);
    politicaService = module.get<PoliticaRetencionService>(
      PoliticaRetencionService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('archivarVencidos', () => {
    const empresaId = 100;

    it('debe exportar a CSV, subir a S3 y eliminar registros vencidos tras una subida exitosa', async () => {
      mockPoliticaRetencionService.getRetencionMeses.mockResolvedValue(24);

      const vencidosMock = [
        { id: 1, empresaId, createdAt: new Date('2020-01-01') },
        { id: 2, empresaId, createdAt: new Date('2020-01-02') },
      ];

      // Simulamos que audit_log tiene registros vencidos y las demás repos no
      mockQueryBuilder.getMany
        .mockResolvedValueOnce(vencidosMock)
        .mockResolvedValue([]);

      const s3SendSpy = jest
        .spyOn(S3Client.prototype, 'send')
        .mockImplementation(() => Promise.resolve({} as any));

      await service.archivarVencidos(empresaId);

      expect(s3SendSpy).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      expect(mockAuditLogRepo.delete).toHaveBeenCalledWith([1, 2]);
    });

    it('no debe eliminar ningún registro si falla la subida a S3 (principio de preservación)', async () => {
      mockPoliticaRetencionService.getRetencionMeses.mockResolvedValue(24);

      const vencidosMock = [
        { id: 10, empresaId, createdAt: new Date('2020-01-01') },
      ];

      mockQueryBuilder.getMany
        .mockResolvedValueOnce(vencidosMock)
        .mockResolvedValue([]);

      const s3SendSpy = jest.spyOn(S3Client.prototype, 'send') as jest.Mock;
      s3SendSpy.mockRejectedValue(new Error('S3 Connection Timeout'));

      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      await service.archivarVencidos(empresaId);

      expect(mockAuditLogRepo.delete).not.toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Fallo al archivar audit_log'),
      );
    });

    it('debe omitir el proceso para entidades que no tengan registros vencidos', async () => {
      mockPoliticaRetencionService.getRetencionMeses.mockResolvedValue(24);
      mockQueryBuilder.getMany.mockResolvedValue([]);
      const s3SendSpy = jest.spyOn(S3Client.prototype, 'send');

      await service.archivarVencidos(empresaId);

      expect(s3SendSpy).not.toHaveBeenCalled();
      expect(mockAuditLogRepo.delete).not.toHaveBeenCalled();
      expect(mockLoteRepo.delete).not.toHaveBeenCalled();
      expect(mockMedicionRepo.delete).not.toHaveBeenCalled();
      expect(mockLecturaRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('findProximosAVencer', () => {
    const empresaId = 100;

    it('debe retornar los registros cuya fecha de vencimiento esté dentro del rango de días de aviso', async () => {
      mockPoliticaRetencionService.getRetencionMeses.mockResolvedValue(24);
      mockPoliticaRetencionService.getDiasAviso.mockResolvedValue(30);

      const fechaCreacionPróxima = new Date();
      fechaCreacionPróxima.setMonth(fechaCreacionPróxima.getMonth() - 24);
      fechaCreacionPróxima.setDate(fechaCreacionPróxima.getDate() + 10); // Vence en 10 días

      const registroProximo = {
        id: 99,
        empresaId,
        createdAt: fechaCreacionPróxima,
      };

      mockAuditLogRepo.find.mockResolvedValue([registroProximo]);
      mockLoteRepo.find.mockResolvedValue([]);
      mockMedicionRepo.find.mockResolvedValue([]);
      mockLecturaRepo.find.mockResolvedValue([]);

      const resultado = await service.findProximosAVencer(empresaId);

      expect(resultado.retencionMeses).toBe(24);
      expect(resultado.diasAvisoVencimiento).toBe(30);
      expect(resultado.registros).toHaveLength(1);
      expect(resultado.registros[0]).toEqual(
        expect.objectContaining({
          entidad: 'audit_log',
          id: 99,
          createdAt: fechaCreacionPróxima,
        }),
      );
      expect(resultado.registros[0].diasRestantes).toBeGreaterThanOrEqual(0);
    });
  });
});