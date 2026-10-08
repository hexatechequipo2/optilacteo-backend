// src/modules/medicion-manual/test/medicion-manual.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MedicionManualService } from '../medicion-manual.service';
import { LOTE_REPOSITORY } from '../../lote/repository/lote-repository.interface';
import { MEDICION_MANUAL_LOTE_REPOSITORY } from '../repository/medicion-manual-lote.repository.interface';
import { SENSOR_LOTE_HISTORIAL_REPOSITORY } from '../../sensor/repository/sensor-lote-historial.repository.interface';
import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { ClasificacionLoteService } from '../../lote/clasificacion-lote.service';
import { AnomaliaService } from '../../anomalia/anomalia.service';
import { SemaforoService } from '../../config-parametro/semaforo.service';
import { MedicionManualMapper } from '../mappers/medicion-manual.mapper';

const mockLoteRepository = {
  findById: jest.fn(),
};

const mockConfigParametroRepository = {
  find: jest.fn(),
};

const mockMedicionRepository = {
  create: jest.fn(),
  findByLotePaginado: jest.fn(),
  findUltimosValores: jest.fn(),
};

const mockSensorLoteHistorialRepository = {
  findSensoresActualesDeLote: jest.fn(),
};

const mockClasificacionLoteService = {
  evaluarYClasificar: jest.fn(),
};

const mockAnomaliaService = {
  evaluarAnomalia: jest.fn(),
};

const mockSemaforoService = {
  evaluarSemaforo: jest.fn(),
};

describe('MedicionManualService', () => {
  let service: MedicionManualService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicionManualService,
        { provide: LOTE_REPOSITORY, useValue: mockLoteRepository },
        {
          provide: getRepositoryToken(ConfiguracionParametro),
          useValue: mockConfigParametroRepository,
        },
        {
          provide: MEDICION_MANUAL_LOTE_REPOSITORY,
          useValue: mockMedicionRepository,
        },
        {
          provide: SENSOR_LOTE_HISTORIAL_REPOSITORY,
          useValue: mockSensorLoteHistorialRepository,
        },
        {
          provide: ClasificacionLoteService,
          useValue: mockClasificacionLoteService,
        },
        { provide: AnomaliaService, useValue: mockAnomaliaService },
        { provide: SemaforoService, useValue: mockSemaforoService },
      ],
    }).compile();

    service = module.get<MedicionManualService>(MedicionManualService);
  });

  afterEach(() => jest.clearAllMocks());

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('registrar', () => {
    const loteId = 1;
    const usuarioId = 10;
    const tenant = { empresaId: 100, rolNombre: 'ADMIN' };
    const dto = {
      tipoMateriaPrima: 'LECHE_ENTERA',
      mediciones: [{ parametro: 'GRASA', valor: 3.5 }],
    } as any;

    it('debe lanzar BadRequestException si tenant.empresaId es nulo', async () => {
      // Arrange
      const tenantInvalido = { empresaId: null } as any;

      // Act & Assert
      await expect(
        service.registrar(loteId, dto, usuarioId, tenantInvalido),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si el lote no existe', async () => {
      // Arrange
      mockLoteRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.registrar(loteId, dto, usuarioId, tenant),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si el lote tiene sensores asociados', async () => {
      // Arrange
      mockLoteRepository.findById.mockResolvedValue({ id: loteId, codigo: 'L-001' });
      mockSensorLoteHistorialRepository.findSensoresActualesDeLote.mockResolvedValue([
        { id: 1 },
      ]);

      // Act & Assert
      await expect(
        service.registrar(loteId, dto, usuarioId, tenant),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe registrar la medición con éxito y gatillar la clasificación automática', async () => {
      // Arrange
      const lote = { id: loteId, codigo: 'L-001' };
      const creadas = [{ parametro: 'GRASA', valor: 3.5 }];

      mockLoteRepository.findById.mockResolvedValue(lote);
      mockSensorLoteHistorialRepository.findSensoresActualesDeLote.mockResolvedValue([]);
      mockConfigParametroRepository.find.mockResolvedValue([]);
      mockMedicionRepository.create.mockResolvedValue(creadas);
      mockMedicionRepository.findUltimosValores.mockResolvedValue([3.2, 3.4]);

      mockClasificacionLoteService.evaluarYClasificar.mockResolvedValue(undefined);
      mockAnomaliaService.evaluarAnomalia.mockResolvedValue(undefined);

      jest.spyOn(MedicionManualMapper, 'toEntities').mockReturnValue(creadas as any);
      jest.spyOn(MedicionManualMapper, 'toResponseItemList').mockReturnValue([
        { parametro: 'GRASA', valor: 3.5, estadoSemaforo: 'VERDE' } as any,
      ]);

      // Act
      const resultado = await service.registrar(loteId, dto, usuarioId, tenant);

      // Assert
      expect(resultado.loteId).toBe(loteId);
      expect(resultado.usuarioId).toBe(usuarioId);
      expect(mockMedicionRepository.create).toHaveBeenCalled();
      expect(mockClasificacionLoteService.evaluarYClasificar).toHaveBeenCalledWith(
        loteId,
        tenant.empresaId,
      );
    });

    it('debe capturar errores de evaluarYClasificar sin fallar el registro principal', async () => {
      // Arrange
      const lote = { id: loteId, codigo: 'L-001' };
      mockLoteRepository.findById.mockResolvedValue(lote);
      mockSensorLoteHistorialRepository.findSensoresActualesDeLote.mockResolvedValue([]);
      mockConfigParametroRepository.find.mockResolvedValue([]);
      mockMedicionRepository.create.mockResolvedValue([{ parametro: 'GRASA', valor: 3.5 }]);
      mockMedicionRepository.findUltimosValores.mockResolvedValue([]);

      mockClasificacionLoteService.evaluarYClasificar.mockRejectedValue(
        new Error('Error de clasificación'),
      );

      jest.spyOn(MedicionManualMapper, 'toEntities').mockReturnValue([]);
      jest.spyOn(MedicionManualMapper, 'toResponseItemList').mockReturnValue([]);

      // Act
      const resultado = await service.registrar(loteId, dto, usuarioId, tenant);

      // Assert
      expect(resultado).toBeDefined();
      expect(mockClasificacionLoteService.evaluarYClasificar).toHaveBeenCalled();
    });
  });

  describe('historial', () => {
    const loteId = 1;
    const tenant = { empresaId: 100, rolNombre: 'ADMIN' };

    it('debe lanzar NotFoundException si el lote no existe', async () => {
      // Arrange
      mockLoteRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.historial(loteId, {}, tenant),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si fechaFin es menor que fechaInicio', async () => {
      // Arrange
      mockLoteRepository.findById.mockResolvedValue({ id: loteId });
      const query = {
        fechaInicio: '2026-03-10',
        fechaFin: '2026-03-01',
      };

      // Act & Assert
      await expect(
        service.historial(loteId, query, tenant),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe consultar el historial paginado y normalizar fechaFin en formato YYYY-MM-DD', async () => {
      // Arrange
      mockLoteRepository.findById.mockResolvedValue({ id: loteId });
      mockMedicionRepository.findByLotePaginado.mockResolvedValue([[], 0]);
      mockConfigParametroRepository.find.mockResolvedValue([]);

      const query = {
        fechaInicio: '2026-03-01',
        fechaFin: '2026-03-10',
        page: 1,
        limit: 10,
      };

      // Act
      const resultado = await service.historial(loteId, query, tenant);

      // Assert
      expect(resultado.page).toBe(1);
      expect(resultado.limit).toBe(10);
      expect(mockMedicionRepository.findByLotePaginado).toHaveBeenCalled();
    });

    it('debe asignar valores de paginación por defecto cuando no se pasan en la query', async () => {
      // Arrange
      mockLoteRepository.findById.mockResolvedValue({ id: loteId });
      mockMedicionRepository.findByLotePaginado.mockResolvedValue([[], 0]);
      mockConfigParametroRepository.find.mockResolvedValue([]);

      // Act
      const resultado = await service.historial(loteId, {}, tenant);

      // Assert
      expect(resultado.page).toBe(1);
      expect(resultado.limit).toBe(20);
    });
  });
});