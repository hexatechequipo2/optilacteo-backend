import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DatasetMlService } from '../dataset-ml.service';
import { SensorLectura } from '../../lectura-sensor/entities/sensor-lectura.entity';
import { MedicionManualLote } from '../../medicion-manual/entities/medicion-manual-lote.entity';
import { Lote } from '../../lote/entities/lote.entity';
import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { OrigenLectura } from '../../lectura-sensor/enums/origen-lectura.enum';
import { OrigenPuntoSerie } from '../dto/punto-serie-response.dto';
import { MAX_LOTES_VENTANA } from '../../estabilidad-proveedor/estabilidad-proveedor.service';

describe('DatasetMlService', () => {
  let service: DatasetMlService;

  const mockQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  const createMockRepo = () => ({
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    find: jest.fn(),
  });

  const mockSensorLecturaRepo = createMockRepo();
  const mockMedicionManualRepo = createMockRepo();
  const mockLoteRepo = createMockRepo();
  const mockConfigRepo = createMockRepo();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatasetMlService,
        {
          provide: getRepositoryToken(SensorLectura),
          useValue: mockSensorLecturaRepo,
        },
        {
          provide: getRepositoryToken(MedicionManualLote),
          useValue: mockMedicionManualRepo,
        },
        {
          provide: getRepositoryToken(Lote),
          useValue: mockLoteRepo,
        },
        {
          provide: getRepositoryToken(ConfiguracionParametro),
          useValue: mockConfigRepo,
        },
      ],
    }).compile();

    service = module.get<DatasetMlService>(DatasetMlService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('obtenerSerie', () => {
    const empresaId = 100;
    const parametro = Parametro.GRASA;
    const desde = new Date('2026-01-01');
    const hasta = new Date('2026-01-31');

    it('debe combinar y ordenar cronológicamente las lecturas de sensor y manuales', async () => {
      const t1 = new Date('2026-01-05T10:00:00Z');
      const t2 = new Date('2026-01-02T10:00:00Z');
      const t3 = new Date('2026-01-10T10:00:00Z');

      const lecturasSensorMock = [
        {
          loteId: 1,
          valor: '3.5',
          timestamp: t1,
          origen: OrigenLectura.SENSOR,
        },
        {
          loteId: 2,
          valor: '3.2',
          timestamp: t2,
          origen: OrigenLectura.MANUAL,
        },
      ];

      const medicionesManualesMock = [
        {
          loteId: 3,
          valor: '3.8',
          timestamp: t3,
        },
      ];

      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce(lecturasSensorMock)
        .mockResolvedValueOnce(medicionesManualesMock);

      const serie = await service.obtenerSerie(
        empresaId,
        parametro,
        desde,
        hasta,
      );

      expect(serie).toHaveLength(3);
      // t2 es la fecha más antigua (2026-01-02)
      expect(serie[0]).toEqual({
        loteId: 2,
        valor: 3.2,
        timestamp: t2,
        origen: OrigenPuntoSerie.MANUAL_FALLBACK,
      });

      // t1 es la segunda (2026-01-05)
      expect(serie[1]).toEqual({
        loteId: 1,
        valor: 3.5,
        timestamp: t1,
        origen: OrigenPuntoSerie.SENSOR,
      });

      // t3 es la última (2026-01-10)
      expect(serie[2]).toEqual({
        loteId: 3,
        valor: 3.8,
        timestamp: t3,
        origen: OrigenPuntoSerie.MANUAL_SIN_SENSOR,
      });
    });

    it('debe retornar un arreglo vacío si no existen registros en el rango de fechas', async () => {
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const serie = await service.obtenerSerie(
        empresaId,
        parametro,
        desde,
        hasta,
      );

      expect(serie).toEqual([]);
    });
  });

  describe('obtenerLotesPorProveedor', () => {
    const empresaId = 100;

    it('debe agrupar los lotes por proveedor, asociar umbrales y omitir lotes sin parámetros', async () => {
      const lotesMock = [
        {
          id: 1,
          proveedorId: 10,
          materiaPrima: 'LECHE_ENTERA',
          proveedor: { razonSocial: 'Lácteos Sur' },
          parametros: [{ parametro: Parametro.GRASA, valor: '3.5' }],
        },
        {
          id: 2,
          proveedorId: 10,
          materiaPrima: 'LECHE_ENTERA',
          proveedor: { razonSocial: 'Lácteos Sur' },
          parametros: [], // Se debe omitir
        },
      ];

      const configsMock = [
        {
          parametro: Parametro.GRASA,
          tipoMateriaPrima: 'LECHE_ENTERA',
          umbralMin: '3.0',
          umbralMax: '4.0',
        },
      ];

      mockLoteRepo.find.mockResolvedValue(lotesMock);
      mockConfigRepo.find.mockResolvedValue(configsMock);

      const resultado = await service.obtenerLotesPorProveedor(empresaId);

      expect(resultado).toHaveLength(1);
      expect(resultado[0]).toEqual({
        proveedorId: 10,
        proveedorNombre: 'Lácteos Sur',
        cantidadLotes: 1,
        series: [
          {
            parametro: Parametro.GRASA,
            materiaPrima: 'LECHE_ENTERA',
            valores: [3.5],
            umbralMin: 3.0,
            umbralMax: 4.0,
          },
        ],
      });
    });

    it('debe respetar el límite de MAX_LOTES_VENTANA por cada proveedor', async () => {
      const lotesExcedidos = Array.from(
        { length: MAX_LOTES_VENTANA + 5 },
        (_, i) => ({
          id: i + 1,
          proveedorId: 10,
          materiaPrima: 'LECHE_ENTERA',
          proveedor: { razonSocial: 'Proveedor Test' },
          parametros: [{ parametro: Parametro.GRASA, valor: '3.5' }],
        }),
      );

      mockLoteRepo.find.mockResolvedValue(lotesExcedidos);
      mockConfigRepo.find.mockResolvedValue([]);

      const resultado = await service.obtenerLotesPorProveedor(empresaId);

      expect(resultado[0].cantidadLotes).toBe(MAX_LOTES_VENTANA);
      expect(resultado[0].series[0].valores).toHaveLength(MAX_LOTES_VENTANA);
    });
  });
});