import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { RetencionController } from '../retencion.controller';
import { PoliticaRetencionService } from '../politica-retencion.service';
import { RetencionArchivadoService } from '../retencion-archivado.service';
import type { TenantContext } from '../../../common/types/tenant-context.type';

describe('RetencionController', () => {
  let controller: RetencionController;
  let politicaService: PoliticaRetencionService;
  let archivadoService: RetencionArchivadoService;

  const mockPoliticaRetencionService = {
    getConfig: jest.fn(),
    update: jest.fn(),
  };

  const mockRetencionArchivadoService = {
    findProximosAVencer: jest.fn(),
  };

  const tenantValido: TenantContext = { empresaId: 100 } as any;
  const tenantSinEmpresa: TenantContext = { empresaId: null } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RetencionController],
      providers: [
        {
          provide: PoliticaRetencionService,
          useValue: mockPoliticaRetencionService,
        },
        {
          provide: RetencionArchivadoService,
          useValue: mockRetencionArchivadoService,
        },
      ],
    }).compile();

    controller = module.get<RetencionController>(RetencionController);
    politicaService = module.get<PoliticaRetencionService>(
      PoliticaRetencionService,
    );
    archivadoService = module.get<RetencionArchivadoService>(
      RetencionArchivadoService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('getPolitica', () => {
    it('debe lanzar ForbiddenException si el usuario no tiene una empresa asociada', () => {
      expect(() => controller.getPolitica(tenantSinEmpresa)).toThrow(
        ForbiddenException,
      );
      expect(politicaService.getConfig).not.toHaveBeenCalled();
    });

    it('debe retornar la configuración invocando a politicaRetencionService.getConfig', async () => {
      const configMock = {
        id: 1,
        empresaId: 100,
        retencionMeses: 24,
        diasAvisoVencimiento: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPoliticaRetencionService.getConfig.mockResolvedValue(configMock);

      const resultado = await controller.getPolitica(tenantValido);

      expect(politicaService.getConfig).toHaveBeenCalledWith(100);
      expect(resultado).toEqual(configMock);
    });
  });

  describe('updatePolitica', () => {
    const dto = {
      retencionMeses: 36,
      diasAvisoVencimiento: 45,
    };

    it('debe lanzar ForbiddenException si el usuario no tiene una empresa asociada', () => {
      expect(() => controller.updatePolitica(tenantSinEmpresa, dto)).toThrow(
        ForbiddenException,
      );
      expect(politicaService.update).not.toHaveBeenCalled();
    });

    it('debe actualizar la política invocando a politicaRetencionService.update', async () => {
      const resultadoMock = {
        id: 1,
        empresaId: 100,
        retencionMeses: 36,
        diasAvisoVencimiento: 45,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPoliticaRetencionService.update.mockResolvedValue(resultadoMock);

      const resultado = await controller.updatePolitica(tenantValido, dto);

      expect(politicaService.update).toHaveBeenCalledWith(100, dto);
      expect(resultado).toEqual(resultadoMock);
    });
  });

  describe('getProximosAVencer', () => {
    it('debe lanzar ForbiddenException si el usuario no tiene una empresa asociada', () => {
      expect(() =>
        controller.getProximosAVencer(tenantSinEmpresa),
      ).toThrow(ForbiddenException);
      expect(archivadoService.findProximosAVencer).not.toHaveBeenCalled();
    });

    it('debe obtener los registros próximos a vencer invocando a archivadoService.findProximosAVencer', async () => {
      const resultadoMock = {
        retencionMeses: 24,
        diasAvisoVencimiento: 30,
        registros: [],
      };

      mockRetencionArchivadoService.findProximosAVencer.mockResolvedValue(
        resultadoMock,
      );

      const resultado = await controller.getProximosAVencer(tenantValido);

      expect(archivadoService.findProximosAVencer).toHaveBeenCalledWith(100);
      expect(resultado).toEqual(resultadoMock);
    });
  });
});