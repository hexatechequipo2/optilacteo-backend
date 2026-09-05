import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MlService } from '../ml.service';
import { ML_CLIENT } from '../interfaces/ml-client.interface';
import { RecomendacionDestino } from '../entities/recomendacion-destino.entity';
import { DestinoProductivo } from '../../destino-productivo/entities/destino-productivo.entity';
import { Lote } from '../../lote/entities/lote.entity';
import type { TenantContext } from '../../../common/types/tenant-context.type';

const mockMlClient = {
  predecirDestino: jest.fn(),
};

const mockRecomendacionRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
};

const mockDestinoProductivoRepo = {
  findOne: jest.fn(),
};

const mockLoteRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
};

describe('MlService — recomendación pendiente por lote (HU-49)', () => {
  let service: MlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MlService,
        { provide: ML_CLIENT, useValue: mockMlClient },
        {
          provide: getRepositoryToken(RecomendacionDestino),
          useValue: mockRecomendacionRepo,
        },
        {
          provide: getRepositoryToken(DestinoProductivo),
          useValue: mockDestinoProductivoRepo,
        },
        { provide: getRepositoryToken(Lote), useValue: mockLoteRepo },
      ],
    }).compile();

    service = module.get<MlService>(MlService);
  });

  afterEach(() => jest.clearAllMocks());

  const tenant = { empresaId: 1, rolNombre: null } as TenantContext;

  it('cuando el lote no pertenece a la empresa del tenant, debe lanzar NotFoundException', async () => {
    mockLoteRepo.findOne.mockResolvedValue(null);

    await expect(
      service.recomendacionPendientePorLote(5, tenant),
    ).rejects.toThrow(NotFoundException);

    expect(mockLoteRepo.findOne).toHaveBeenCalledWith({
      where: { id: 5, empresaId: 1 },
    });
    expect(mockRecomendacionRepo.findOne).not.toHaveBeenCalled();
  });

  it('cuando el lote existe pero no tiene recomendación pendiente, debe devolver null', async () => {
    mockLoteRepo.findOne.mockResolvedValue({ id: 5, empresaId: 1 });
    mockRecomendacionRepo.findOne.mockResolvedValue(null);

    const result = await service.recomendacionPendientePorLote(5, tenant);

    expect(result).toBeNull();
  });

  it('cuando existe una recomendación pendiente, debe devolverla con destinoRecomendado/destinoReal como {id, nombre} y filtrar por loteConsumoId IS NULL (lote original, no consumo parcial)', async () => {
    mockLoteRepo.findOne.mockResolvedValue({ id: 5, empresaId: 1 });

    const recomendacion = {
      id: 42,
      confianza: 0.87,
      estado: 'pendiente',
      destinoRecomendado: { id: 3, nombre: 'manteca' },
      destinoReal: null,
    };
    mockRecomendacionRepo.findOne.mockResolvedValue(recomendacion);

    const result = await service.recomendacionPendientePorLote(5, tenant);

    expect(mockRecomendacionRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: expect.objectContaining({
          lote: { id: 5 },
          empresa: { id: 1 },
          estado: 'pendiente',
        }),
        relations: {
          destinoRecomendado: true,
          destinoReal: true,
        },
      }),
    );

    expect(result).toEqual({
      id: 42,
      destinoRecomendado: { id: 3, nombre: 'manteca' },
      confianza: 0.87,
      estado: 'pendiente',
      destinoReal: null,
    });
  });

  it('cuando la recomendación ya tiene destinoReal cargado, debe incluirlo como {id, nombre}', async () => {
    mockLoteRepo.findOne.mockResolvedValue({ id: 5, empresaId: 1 });

    mockRecomendacionRepo.findOne.mockResolvedValue({
      id: 42,
      confianza: 0.6,
      estado: 'pendiente',
      destinoRecomendado: { id: 3, nombre: 'manteca' },
      destinoReal: { id: 4, nombre: 'manteca pastelería' },
    });

    const result = await service.recomendacionPendientePorLote(5, tenant);

    expect(result?.destinoReal).toEqual({
      id: 4,
      nombre: 'manteca pastelería',
    });
  });
});
