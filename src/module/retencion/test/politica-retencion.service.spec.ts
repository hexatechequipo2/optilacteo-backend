import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { PoliticaRetencionService } from '../politica-retencion.service';
import { POLITICA_RETENCION_REPOSITORY } from '../repository/politica-retencion.repository.interface';
import { RETENCION_MESES_MINIMO } from '../entities/politica-retencion.entity';

describe('PoliticaRetencionService', () => {
  let service: PoliticaRetencionService;

  const mockRepository = {
    findByEmpresa: jest.fn(),
    create: jest.fn((dto) => ({ ...dto })),
    save: jest.fn().mockImplementation((entity) =>
      Promise.resolve({
        id: entity.id ?? 1,
        createdAt: entity.createdAt ?? new Date(),
        updatedAt: entity.updatedAt ?? new Date(),
        ...entity,
      }),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliticaRetencionService,
        {
          provide: POLITICA_RETENCION_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PoliticaRetencionService>(PoliticaRetencionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('getConfig', () => {
    const empresaId = 100;

    it('debe retornar los valores por defecto (AC2) si la empresa no tiene configuración guardada', async () => {
      mockRepository.findByEmpresa.mockResolvedValue(null);

      const resultado = await service.getConfig(empresaId);

      expect(resultado).toEqual({
        id: 0,
        empresaId,
        retencionMeses: RETENCION_MESES_MINIMO,
        diasAvisoVencimiento: 30,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      });
      expect(mockRepository.findByEmpresa).toHaveBeenCalledWith(empresaId);
    });

    it('debe retornar la configuración formateada como DTO si ya existe en la BD', async () => {
      const ahora = new Date();
      const configExistente = {
        id: 5,
        empresaId,
        retencionMeses: 24,
        diasAvisoVencimiento: 60,
        createdAt: ahora,
        updatedAt: ahora,
      };

      mockRepository.findByEmpresa.mockResolvedValue(configExistente);

      const resultado = await service.getConfig(empresaId);

      expect(resultado).toEqual({
        id: 5,
        empresaId,
        retencionMeses: 24,
        diasAvisoVencimiento: 60,
        createdAt: ahora,
        updatedAt: ahora,
      });
    });
  });

  describe('getRetencionMeses', () => {
    const empresaId = 100;

    it('debe retornar el valor guardado de retencionMeses', async () => {
      mockRepository.findByEmpresa.mockResolvedValue({ retencionMeses: 36 });

      const meses = await service.getRetencionMeses(empresaId);

      expect(meses).toBe(36);
    });

    it('debe retornar RETENCION_MESES_MINIMO si no hay registro', async () => {
      mockRepository.findByEmpresa.mockResolvedValue(null);

      const meses = await service.getRetencionMeses(empresaId);

      expect(meses).toBe(RETENCION_MESES_MINIMO);
    });
  });

  describe('getDiasAviso', () => {
    const empresaId = 100;

    it('debe retornar los días de aviso guardados', async () => {
      mockRepository.findByEmpresa.mockResolvedValue({
        diasAvisoVencimiento: 45,
      });

      const dias = await service.getDiasAviso(empresaId);

      expect(dias).toBe(45);
    });

    it('debe retornar 30 días como default si no existe registro', async () => {
      mockRepository.findByEmpresa.mockResolvedValue(null);

      const dias = await service.getDiasAviso(empresaId);

      expect(dias).toBe(30);
    });
  });

  describe('update', () => {
    const empresaId = 100;

    it('debe lanzar ConflictException (AC4) si retencionMeses es inferior al mínimo legal', async () => {
      const dtoInvalido = {
        retencionMeses: RETENCION_MESES_MINIMO - 1,
        diasAvisoVencimiento: 30,
      };

      await expect(service.update(empresaId, dtoInvalido)).rejects.toThrow(
        ConflictException,
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('debe crear una nueva configuración si la empresa no tenía una previa', async () => {
      const dto = {
        retencionMeses: 24,
        diasAvisoVencimiento: 45,
      };

      mockRepository.findByEmpresa.mockResolvedValue(null);

      const resultado = await service.update(empresaId, dto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        empresaId,
        retencionMeses: 24,
        diasAvisoVencimiento: 45,
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(resultado.retencionMeses).toBe(24);
      expect(resultado.diasAvisoVencimiento).toBe(45);
    });

    it('debe actualizar una configuración existente manteniendo los días de aviso por defecto si no se proveen', async () => {
      const configExistente = {
        id: 10,
        empresaId,
        retencionMeses: 24,
        diasAvisoVencimiento: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dto = {
        retencionMeses: 36, // Usamos un valor >= RETENCION_MESES_MINIMO (24)
      };

      mockRepository.findByEmpresa.mockResolvedValue(configExistente);

      const resultado = await service.update(empresaId, dto);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 10,
          empresaId,
          retencionMeses: 36,
          diasAvisoVencimiento: 30,
        }),
      );
      expect(resultado.retencionMeses).toBe(36);
      expect(resultado.diasAvisoVencimiento).toBe(30);
    });
  });
});