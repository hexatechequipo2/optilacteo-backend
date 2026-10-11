import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { DatasetMlController } from '../dataset-ml.controller';
import { DatasetMlService } from '../dataset-ml.service';
import { SeriesHistoricasQueryDto } from '../dto/series-historicas-query.dto';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { EstabilidadProveedorService } from '../../estabilidad-proveedor/estabilidad-proveedor.service';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { InternalApiKeyGuard } from '../../internal/guards/internal-api-key.guard';

describe('DatasetMlController — datos de entrenamiento para microservicio ML (HU-50)', () => {
  let controller: DatasetMlController;
  let service: DatasetMlService;

  const mockDatasetMlService = {
    obtenerSerie: jest.fn(),
    obtenerLotesPorProveedor: jest.fn(),
  };

  const mockQueryDto: SeriesHistoricasQueryDto = {
    empresaId: 1,
    parametro: Parametro.PH,
    desde: '2026-01-01T00:00:00.000Z',
    hasta: '2026-01-31T23:59:59.000Z',
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DatasetMlController],
      providers: [
        {
          provide: DatasetMlService,
          useValue: mockDatasetMlService,
        },
        { provide: EstabilidadProveedorService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    controller = module.get<DatasetMlController>(DatasetMlController);
    service = module.get<DatasetMlService>(DatasetMlService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('es @Public() y exige InternalApiKeyGuard en toda la clase (el microservicio no manda JWT)', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, DatasetMlController)).toBe(true);
    expect(Reflect.getMetadata(GUARDS_METADATA, DatasetMlController)).toEqual([
      InternalApiKeyGuard,
    ]);
  });

  it('debe delegar al servicio parseando las fechas a objetos Date', async () => {
    const mockSerieResult = [
      { fecha: new Date('2026-01-10'), valor: 6.5 },
      { fecha: new Date('2026-01-11'), valor: 6.6 },
    ];

    mockDatasetMlService.obtenerSerie.mockResolvedValue(mockSerieResult);

    const resultado = await controller.obtenerSerie(mockQueryDto);

    expect(service.obtenerSerie).toHaveBeenCalledWith(
      mockQueryDto.empresaId,
      mockQueryDto.parametro,
      new Date(mockQueryDto.desde),
      new Date(mockQueryDto.hasta),
    );
    expect(resultado).toEqual(mockSerieResult);
  });

  it('debe delegar al servicio al obtener los lotes por proveedor', async () => {
    const mockLotes = [
      { proveedorId: 1, lotes: [{ id: 10 }, { id: 11 }] },
      { proveedorId: 2, lotes: [{ id: 20 }] },
    ];

    mockDatasetMlService.obtenerLotesPorProveedor.mockResolvedValue(mockLotes);

    const resultado = await controller.obtenerLotesPorProveedor(1);

    expect(service.obtenerLotesPorProveedor).toHaveBeenCalledWith(1);
    expect(resultado).toEqual(mockLotes);
  });

  it('debe propagar el error del servicio al obtener la serie histórica', async () => {
    const error = new Error('Error al obtener la serie histórica');

    mockDatasetMlService.obtenerSerie.mockRejectedValue(error);

    await expect(controller.obtenerSerie(mockQueryDto)).rejects.toThrow(
      'Error al obtener la serie histórica',
    );
  });

  it('debe propagar el error del servicio al obtener los lotes por proveedor', async () => {
    const error = new Error('Error al obtener los lotes');

    mockDatasetMlService.obtenerLotesPorProveedor.mockRejectedValue(error);

    await expect(controller.obtenerLotesPorProveedor(1)).rejects.toThrow(
      'Error al obtener los lotes',
    );
  });

});