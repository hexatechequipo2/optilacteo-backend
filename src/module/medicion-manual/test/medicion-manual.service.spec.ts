import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MedicionManualService } from '../medicion-manual.service';
import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { LOTE_REPOSITORY } from '../../lote/repository/lote-repository.interface';
import { MEDICION_MANUAL_LOTE_REPOSITORY } from '../repository/medicion-manual-lote.repository.interface';
import { SENSOR_LOTE_HISTORIAL_REPOSITORY } from '../../sensor/repository/sensor-lote-historial.repository.interface';
import { ClasificacionLoteService } from '../../lote/clasificacion-lote.service';
import { MedicionManualMapper } from '../mappers/medicion-manual.mapper';
import { TenantContext } from '../../../common/types/tenant-context.type';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { CreateMedicionManualLoteDto } from '../dto/create-medicion-manual-lote.dto';
import { HistorialMedicionManualFilterQueryDto } from '../dto/historial-medicion-manual-filter-query.dto';

describe('MedicionManualService', () => {
  let service: MedicionManualService;
  let loteRepoMock: any;
  let configParametroRepoMock: jest.Mocked<Repository<ConfiguracionParametro>>;
  let medicionRepoMock: any;
  let sensorLoteHistorialRepoMock: any;
  let clasificacionLoteServiceMock: jest.Mocked<ClasificacionLoteService>;

  const mockTenant: TenantContext = {
    empresaId: 1,
    rolNombre: 'ADMIN' as any,
  };

  beforeEach(async () => {
    loteRepoMock = {
      findById: jest.fn(),
    };

    medicionRepoMock = {
      create: jest.fn(),
      findByLotePaginado: jest.fn(),
    };

    sensorLoteHistorialRepoMock = {
      findSensoresActualesDeLote: jest.fn(),
    };

    clasificacionLoteServiceMock = {
      evaluarYClasificar: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicionManualService,
        {
          provide: LOTE_REPOSITORY,
          useValue: loteRepoMock,
        },
        {
          provide: getRepositoryToken(ConfiguracionParametro),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: MEDICION_MANUAL_LOTE_REPOSITORY,
          useValue: medicionRepoMock,
        },
        {
          provide: SENSOR_LOTE_HISTORIAL_REPOSITORY,
          useValue: sensorLoteHistorialRepoMock,
        },
        {
          provide: ClasificacionLoteService,
          useValue: clasificacionLoteServiceMock,
        },
      ],
    }).compile();

    service = module.get<MedicionManualService>(MedicionManualService);
    configParametroRepoMock = module.get(
      getRepositoryToken(ConfiguracionParametro),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('registrar', () => {
    const loteId = 10;
    const usuarioId = 5;
    const dto: CreateMedicionManualLoteDto = {
      tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
      parametros: [
        { parametro: Parametro.TEMPERATURA, valor: 4.5 },
        { parametro: Parametro.PH, valor: 6.7 },
      ],
    } as any;

    it('debe lanzar BadRequestException si tenant.empresaId es nulo', async () => {
      const invalidTenant = { empresaId: null } as any;

      await expect(
        service.registrar(loteId, dto, usuarioId, invalidTenant),
      ).rejects.toThrow(
        new BadRequestException(
          'No se pudo determinar la empresa del usuario autenticado',
        ),
      );
    });

    it('debe lanzar NotFoundException si el lote no existe', async () => {
      loteRepoMock.findById.mockResolvedValue(null);

      await expect(
        service.registrar(loteId, dto, usuarioId, mockTenant),
      ).rejects.toThrow(new NotFoundException(`Lote ${loteId} no encontrado`));

      expect(loteRepoMock.findById).toHaveBeenCalledWith(loteId, 1);
    });

    it('debe lanzar BadRequestException si el lote tiene sensores asociados', async () => {
      loteRepoMock.findById.mockResolvedValue({ id: loteId, empresaId: 1 });
      sensorLoteHistorialRepoMock.findSensoresActualesDeLote.mockResolvedValue([
        { id: 100 },
      ]);

      await expect(
        service.registrar(loteId, dto, usuarioId, mockTenant),
      ).rejects.toThrow(
        new BadRequestException(
          `El lote ${loteId} tiene sensores asociados. Para reportar un valor cuando un sensor puntual no está disponible, use el ingreso manual por sensor (HU-15).`,
        ),
      );
    });

    it('debe lanzar BadRequestException si faltan parámetros obligatorios', async () => {
      loteRepoMock.findById.mockResolvedValue({ id: loteId, empresaId: 1 });
      sensorLoteHistorialRepoMock.findSensoresActualesDeLote.mockResolvedValue(
        [],
      );

      // Configuraciones requieren TEMPERATURA, PH y GRASA (falta GRASA en el DTO)
      configParametroRepoMock.find.mockResolvedValue([
        { parametro: Parametro.TEMPERATURA } as any,
        { parametro: Parametro.PH } as any,
        { parametro: Parametro.GRASA } as any,
      ]);

      await expect(
        service.registrar(loteId, dto, usuarioId, mockTenant),
      ).rejects.toThrow(
        new BadRequestException(
          `Faltan parámetros obligatorios para '${dto.tipoMateriaPrima}': grasa`,
        ),
      );
    });

    it('debe registrar la medición con éxito y gatillar la clasificación automática', async () => {
      loteRepoMock.findById.mockResolvedValue({ id: loteId, empresaId: 1 });
      sensorLoteHistorialRepoMock.findSensoresActualesDeLote.mockResolvedValue(
        [],
      );

      const configs = [
        {
          parametro: Parametro.TEMPERATURA,
          tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
        },
        {
          parametro: Parametro.PH,
          tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
        },
      ] as ConfiguracionParametro[];
      configParametroRepoMock.find.mockResolvedValue(configs);

      const mockEntities = [{ id: 1 }, { id: 2 }];
      const mockCreated = [{ id: 1 }, { id: 2 }];
      const mockResponseItems = [
        { parametro: Parametro.TEMPERATURA, valor: 4.5 },
        { parametro: Parametro.PH, valor: 6.7 },
      ];

      jest
        .spyOn(MedicionManualMapper, 'toEntities')
        .mockReturnValue(mockEntities as any);
      medicionRepoMock.create.mockResolvedValue(mockCreated);
      jest
        .spyOn(MedicionManualMapper, 'toResponseItemList')
        .mockReturnValue(mockResponseItems as any);

      clasificacionLoteServiceMock.evaluarYClasificar.mockResolvedValue(
        undefined as any,
      );

      const resultado = await service.registrar(
        loteId,
        dto,
        usuarioId,
        mockTenant,
      );

      expect(MedicionManualMapper.toEntities).toHaveBeenCalledWith(
        dto,
        loteId,
        1,
        usuarioId,
      );
      expect(medicionRepoMock.create).toHaveBeenCalledWith(mockEntities);
      expect(clasificacionLoteServiceMock.evaluarYClasificar).toHaveBeenCalledWith(
        loteId,
        1,
      );
      expect(resultado).toEqual({
        loteId,
        tipoMateriaPrima: dto.tipoMateriaPrima,
        usuarioId,
        mediciones: mockResponseItems,
      });
    });

    it('debe capturar errores de evaluarYClasificar sin fallar el registro principal', async () => {
      loteRepoMock.findById.mockResolvedValue({ id: loteId, empresaId: 1 });
      sensorLoteHistorialRepoMock.findSensoresActualesDeLote.mockResolvedValue(
        [],
      );

      configParametroRepoMock.find.mockResolvedValue([]);
      medicionRepoMock.create.mockResolvedValue([]);
      jest.spyOn(MedicionManualMapper, 'toEntities').mockReturnValue([]);
      jest
        .spyOn(MedicionManualMapper, 'toResponseItemList')
        .mockReturnValue([]);

      // Simula que evaluarYClasificar falla
      clasificacionLoteServiceMock.evaluarYClasificar.mockRejectedValue(
        new Error('Error de conexión con la BD'),
      );

      const resultado = await service.registrar(
        loteId,
        dto,
        usuarioId,
        mockTenant,
      );

      expect(resultado.loteId).toBe(loteId);
      expect(clasificacionLoteServiceMock.evaluarYClasificar).toHaveBeenCalledWith(
        loteId,
        1,
      );
    });
  });

  describe('historial', () => {
    const loteId = 10;

    it('debe lanzar NotFoundException si el lote no existe', async () => {
      loteRepoMock.findById.mockResolvedValue(null);

      await expect(
        service.historial(loteId, {}, mockTenant),
      ).rejects.toThrow(new NotFoundException(`Lote ${loteId} no encontrado`));
    });

    it('debe lanzar BadRequestException si fechaFin es menor que fechaInicio', async () => {
      loteRepoMock.findById.mockResolvedValue({ id: loteId, empresaId: 1 });

      const query: HistorialMedicionManualFilterQueryDto = {
        fechaInicio: '2026-07-31T10:00:00Z',
        fechaFin: '2026-07-30T10:00:00Z',
      };

      await expect(
        service.historial(loteId, query, mockTenant),
      ).rejects.toThrow(
        new BadRequestException(
          'La fecha de fin no puede ser anterior a la fecha de inicio.',
        ),
      );
    });

    it('debe consultar el historial paginado y normalizar fechaFin en formato YYYY-MM-DD', async () => {
      loteRepoMock.findById.mockResolvedValue({ id: loteId, empresaId: 1 });

      const query: HistorialMedicionManualFilterQueryDto = {
        fechaInicio: '2026-07-01',
        fechaFin: '2026-07-31',
        page: 2,
        limit: 10,
      };

      const mockMediciones = [{ id: 101 }];
      medicionRepoMock.findByLotePaginado.mockResolvedValue([
        mockMediciones,
        15,
      ]);

      const mockConfigs = [
        {
          parametro: Parametro.TEMPERATURA,
          tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
        },
      ];
      configParametroRepoMock.find.mockResolvedValue(mockConfigs as any);

      const mockResponseItems = [{ id: 101, valor: 5.0 }];
      jest
        .spyOn(MedicionManualMapper, 'toResponseItemList')
        .mockReturnValue(mockResponseItems as any);

      const resultado = await service.historial(loteId, query, mockTenant);

      const fechaFinEsperada = new Date('2026-07-31');
      fechaFinEsperada.setUTCHours(23, 59, 59, 999);

      expect(medicionRepoMock.findByLotePaginado).toHaveBeenCalledWith(
        {
          loteId,
          fechaInicio: new Date('2026-07-01'),
          fechaFin: fechaFinEsperada,
          page: 2,
          limit: 10,
        },
        1,
      );
      expect(resultado).toEqual({
        data: mockResponseItems,
        total: 15,
        page: 2,
        limit: 10,
      });
    });

    it('debe asignar valores de paginación por defecto cuando no se pasan en la query', async () => {
      loteRepoMock.findById.mockResolvedValue({ id: loteId, empresaId: 1 });

      medicionRepoMock.findByLotePaginado.mockResolvedValue([[], 0]);
      configParametroRepoMock.find.mockResolvedValue([]);
      jest
        .spyOn(MedicionManualMapper, 'toResponseItemList')
        .mockReturnValue([]);

      const resultado = await service.historial(loteId, {}, mockTenant);

      expect(medicionRepoMock.findByLotePaginado).toHaveBeenCalledWith(
        {
          loteId,
          fechaInicio: undefined,
          fechaFin: undefined,
          page: 1,
          limit: 20,
        },
        1,
      );
      expect(resultado).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });
    });
  });
});