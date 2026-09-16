import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DatasetMlService } from '../dataset-ml.service';
import { SensorLectura } from '../../lectura-sensor/entities/sensor-lectura.entity';
import { MedicionManualLote } from '../../medicion-manual/entities/medicion-manual-lote.entity';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { OrigenLectura } from '../../lectura-sensor/enums/origen-lectura.enum';
import { OrigenPuntoSerie } from '../dto/punto-serie-response.dto';

describe('DatasetMlService — obtención de series históricas para ML (HU-50)', () => {
  let service: DatasetMlService;

  const createQueryBuilderMock = () => {
    const qb: any = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };
    return qb;
  };

  let sensorLecturaQb: ReturnType<typeof createQueryBuilderMock>;
  let medicionManualQb: ReturnType<typeof createQueryBuilderMock>;

  const mockSensorLecturaRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockMedicionManualRepo = {
    createQueryBuilder: jest.fn(),
  };

  const empresaId = 1;
  const parametro = Parametro.PH;
  const desde = new Date('2026-01-01T00:00:00Z');
  const hasta = new Date('2026-01-31T23:59:59Z');

  beforeEach(async () => {
    sensorLecturaQb = createQueryBuilderMock();
    medicionManualQb = createQueryBuilderMock();

    mockSensorLecturaRepo.createQueryBuilder.mockReturnValue(sensorLecturaQb);
    mockMedicionManualRepo.createQueryBuilder.mockReturnValue(medicionManualQb);

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
      ],
    }).compile();

    service = module.get<DatasetMlService>(DatasetMlService);
  });

  afterEach(() => jest.clearAllMocks());

  it('cuando existen datos tanto de sensores como de mediciones manuales, debe combinar, mapear origenes y ordenar la serie cronológicamente', async () => {
    const fechaA = new Date('2026-01-05T10:00:00Z');
    const fechaB = new Date('2026-01-02T10:00:00Z');
    const fechaC = new Date('2026-01-10T10:00:00Z');

    const mockDeSensor = [
      {
        loteId: 10,
        valor: '4.5',
        timestamp: fechaA,
        origen: OrigenLectura.SENSOR,
      },
      {
        loteId: 10,
        valor: '4.6',
        timestamp: fechaB,
        origen: OrigenLectura.MANUAL, // Fallback por sensor en falla
      },
    ];

    const mockDeManual = [
      {
        loteId: 20,
        valor: '4.2',
        timestamp: fechaC,
      },
    ];

    sensorLecturaQb.getRawMany.mockResolvedValue(mockDeSensor);
    medicionManualQb.getRawMany.mockResolvedValue(mockDeManual);

    const resultado = await service.obtenerSerie(empresaId, parametro, desde, hasta);

    expect(sensorLecturaQb.where).toHaveBeenCalledWith('sl.empresaId = :empresaId', { empresaId });
    expect(sensorLecturaQb.andWhere).toHaveBeenCalledWith('sensor.parametro = :parametro', { parametro });
    expect(sensorLecturaQb.andWhere).toHaveBeenCalledWith('sl.timestampLectura BETWEEN :desde AND :hasta', { desde, hasta });

    expect(medicionManualQb.where).toHaveBeenCalledWith('m.empresaId = :empresaId', { empresaId });
    expect(medicionManualQb.andWhere).toHaveBeenCalledWith('m.parametro = :parametro', { parametro });
    expect(medicionManualQb.andWhere).toHaveBeenCalledWith('m.createdAt BETWEEN :desde AND :hasta', { desde, hasta });

    expect(resultado).toHaveLength(3);

    // Verificación de orden cronológico (fechaB [Jan 2] < fechaA [Jan 5] < fechaC [Jan 10])
    expect(resultado[0]).toEqual({
      loteId: 10,
      valor: 4.6,
      timestamp: fechaB,
      origen: OrigenPuntoSerie.MANUAL_FALLBACK,
    });

    expect(resultado[1]).toEqual({
      loteId: 10,
      valor: 4.5,
      timestamp: fechaA,
      origen: OrigenPuntoSerie.SENSOR,
    });

    expect(resultado[2]).toEqual({
      loteId: 20,
      valor: 4.2,
      timestamp: fechaC,
      origen: OrigenPuntoSerie.MANUAL_SIN_SENSOR,
    });
  });

  it('cuando no hay registros en ninguna de las fuentes, debe retornar una lista vacía', async () => {
    sensorLecturaQb.getRawMany.mockResolvedValue([]);
    medicionManualQb.getRawMany.mockResolvedValue([]);

    const resultado = await service.obtenerSerie(empresaId, parametro, desde, hasta);

    expect(resultado).toEqual([]);
  });
});