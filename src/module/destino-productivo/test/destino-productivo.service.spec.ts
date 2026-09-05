import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DestinoProductivoService } from '../destino-productivo.service';
import { DestinoProductivo } from '../entities/destino-productivo.entity';
import type { TenantContext } from '../../../common/types/tenant-context.type';

const mockDestinoProductivoRepo = {
  find: jest.fn(),
};

describe('DestinoProductivoService — catálogo de destinos productivos (HU-49)', () => {
  let service: DestinoProductivoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DestinoProductivoService,
        {
          provide: getRepositoryToken(DestinoProductivo),
          useValue: mockDestinoProductivoRepo,
        },
      ],
    }).compile();

    service = module.get<DestinoProductivoService>(DestinoProductivoService);
  });

  afterEach(() => jest.clearAllMocks());

  const tenant = { empresaId: 1, rolNombre: null } as TenantContext;

  it('debe consultar solo los destinos activos de la empresa del tenant, ordenados por nombre', async () => {
    mockDestinoProductivoRepo.find.mockResolvedValue([]);

    await service.findActivos(tenant);

    expect(mockDestinoProductivoRepo.find).toHaveBeenCalledWith({
      where: { empresaId: 1, activo: true },
      order: { nombre: 'ASC' },
    });
  });

  it('debe devolver únicamente {id, nombre} por cada destino, sin exponer el resto de la entidad', async () => {
    mockDestinoProductivoRepo.find.mockResolvedValue([
      {
        id: 3,
        empresaId: 1,
        nombre: 'manteca',
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 4,
        empresaId: 1,
        nombre: 'manteca pastelería',
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await service.findActivos(tenant);

    expect(result).toEqual([
      { id: 3, nombre: 'manteca' },
      { id: 4, nombre: 'manteca pastelería' },
    ]);
  });

  it('cuando la empresa no tiene destinos productivos configurados, debe devolver un array vacío', async () => {
    mockDestinoProductivoRepo.find.mockResolvedValue([]);

    const result = await service.findActivos(tenant);

    expect(result).toEqual([]);
  });
});
