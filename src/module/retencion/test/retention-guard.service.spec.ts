import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { RetentionGuardService } from '../retention-guard.service';
import { PoliticaRetencionService } from '../politica-retencion.service';

describe('RetentionGuardService', () => {
  let service: RetentionGuardService;
  let politicaService: PoliticaRetencionService;

  const mockPoliticaRetencionService = {
    getRetencionMeses: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetentionGuardService,
        {
          provide: PoliticaRetencionService,
          useValue: mockPoliticaRetencionService,
        },
      ],
    }).compile();

    service = module.get<RetentionGuardService>(RetentionGuardService);
    politicaService = module.get<PoliticaRetencionService>(
      PoliticaRetencionService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('assertPuedeEliminar', () => {
    const empresaId = 100;
    const entidad = 'Lote';

    it('debe lanzar ForbiddenException si el registro aún no cumplió el período mínimo de retención', async () => {
      mockPoliticaRetencionService.getRetencionMeses.mockResolvedValue(24);

      const fechaReciente = new Date();
      fechaReciente.setMonth(fechaReciente.getMonth() - 1);

      await expect(
        service.assertPuedeEliminar(empresaId, entidad, fechaReciente),
      ).rejects.toThrow(ForbiddenException);

      expect(politicaService.getRetencionMeses).toHaveBeenCalledWith(empresaId);
    });

    it('debe incluir el nombre de la entidad y la fecha de vencimiento en el mensaje de error', async () => {
      mockPoliticaRetencionService.getRetencionMeses.mockResolvedValue(24);

      const fechaCreacion = new Date('2026-01-01T00:00:00.000Z');

      await expect(
        service.assertPuedeEliminar(empresaId, entidad, fechaCreacion),
      ).rejects.toThrow(
        /No se puede eliminar este registro de Lote: no cumplió el período mínimo de retención de 24 meses/,
      );
    });

    it('no debe lanzar excepción y permitir la eliminación si el período de retención ya se cumplió', async () => {
      // Arrange: retención de 24 meses y registro creado hace 30 meses (vencido/archivado)
      mockPoliticaRetencionService.getRetencionMeses.mockResolvedValue(24);

      const fechaAntigua = new Date();
      fechaAntigua.setMonth(fechaAntigua.getMonth() - 30);

      await expect(
        service.assertPuedeEliminar(empresaId, entidad, fechaAntigua),
      ).resolves.not.toThrow();

      expect(politicaService.getRetencionMeses).toHaveBeenCalledWith(empresaId);
    });
  });
});