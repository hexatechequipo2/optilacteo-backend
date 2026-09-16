import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';

import { DatasetMlController } from '../dataset-ml.controller';
import { DatasetMlService } from '../dataset-ml.service';
import { SeriesHistoricasQueryDto } from '../dto/series-historicas-query.dto';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

describe('DatasetMlController — datos de entrenamiento para microservicio ML (HU-50)', () => {
  let controller: DatasetMlController;
  let service: DatasetMlService;

  const originalEnv = process.env;
  const mockApiKey = 'secret-internal-key-2026';

  const mockDatasetMlService = {
    obtenerSerie: jest.fn(),
  };

  const mockQueryDto: SeriesHistoricasQueryDto = {
    empresaId: 1,
    parametro: Parametro.PH,
    desde: '2026-01-01T00:00:00.000Z',
    hasta: '2026-01-31T23:59:59.000Z',
  } as any;

  beforeEach(async () => {
    process.env = { ...originalEnv, NEST_INTERNAL_API_KEY: mockApiKey };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DatasetMlController],
      providers: [
        {
          provide: DatasetMlService,
          useValue: mockDatasetMlService,
        },
      ],
    }).compile();

    controller = module.get<DatasetMlController>(DatasetMlController);
    service = module.get<DatasetMlService>(DatasetMlService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('cuando la API key interna no se provee en los headers, debe lanzar UnauthorizedException', () => {
    const invalidApiKey = '';

    expect(() => controller.obtenerSerie(mockQueryDto, invalidApiKey)).toThrow(
      UnauthorizedException,
    );
    expect(service.obtenerSerie).not.toHaveBeenCalled();
  });

  it('cuando la API key interna proporcionada es incorrecta, debe lanzar UnauthorizedException', () => {
    const invalidApiKey = 'key-incorrecta';

    expect(() => controller.obtenerSerie(mockQueryDto, invalidApiKey)).toThrow(
      UnauthorizedException,
    );
    expect(service.obtenerSerie).not.toHaveBeenCalled();
  });

  it('cuando la API key es válida, debe delegar al servicio parseando las fechas a objetos Date', async () => {
    const mockSerieResult = [
      { fecha: new Date('2026-01-10'), valor: 6.5 },
      { fecha: new Date('2026-01-11'), valor: 6.6 },
    ];

    mockDatasetMlService.obtenerSerie.mockResolvedValue(mockSerieResult);

    const resultado = await controller.obtenerSerie(mockQueryDto, mockApiKey);

    expect(service.obtenerSerie).toHaveBeenCalledWith(
      mockQueryDto.empresaId,
      mockQueryDto.parametro,
      new Date(mockQueryDto.desde),
      new Date(mockQueryDto.hasta),
    );
    expect(resultado).toEqual(mockSerieResult);
  });
});