import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { DestinoProductivoService } from '../destino-productivo.service';
import { DestinoProductivo } from '../entities/destino-productivo.entity';
import { CreateDestinoProductivoDto } from '../dto/create-destino-productivo.dto';
import type { TenantContext } from '../../../common/types/tenant-context.type';

describe('DestinoProductivoService — catálogo de destinos productivos (HU-49)', () => {
  let service: DestinoProductivoService;

  const mockDestinoProductivoRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const tenant = { empresaId: 1, rolNombre: null } as TenantContext;

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

  describe('findActivos', () => {
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

  describe('create', () => {
    it('cuando ya existe un destino productivo con el mismo nombre para la empresa, debe lanzar ConflictException', async () => {
      const dto: CreateDestinoProductivoDto = { nombre: ' Manteca ' };
      mockDestinoProductivoRepo.findOne.mockResolvedValue({
        id: 1,
        nombre: 'Manteca',
        empresaId: 1,
      });

      await expect(service.create(tenant, dto)).rejects.toThrow(
        ConflictException,
      );

      expect(mockDestinoProductivoRepo.findOne).toHaveBeenCalledWith({
        where: { empresaId: 1, nombre: 'Manteca' },
      });
      expect(mockDestinoProductivoRepo.create).not.toHaveBeenCalled();
      expect(mockDestinoProductivoRepo.save).not.toHaveBeenCalled();
    });

    it('cuando el nombre es nuevo, debe crear y guardar el destino sanitizando espacios con trim', async () => {
      const dto: CreateDestinoProductivoDto = { nombre: ' Dulce de Leche ' };
      const nombreSanitizado = 'Dulce de Leche';

      const entityToCreate = {
        empresaId: 1,
        nombre: nombreSanitizado,
        activo: true,
      };

      const entitySaved = {
        id: 10,
        ...entityToCreate,
      };

      mockDestinoProductivoRepo.findOne.mockResolvedValue(null);
      mockDestinoProductivoRepo.create.mockReturnValue(entityToCreate);
      mockDestinoProductivoRepo.save.mockResolvedValue(entitySaved);

      const result = await service.create(tenant, dto);

      expect(mockDestinoProductivoRepo.findOne).toHaveBeenCalledWith({
        where: { empresaId: 1, nombre: nombreSanitizado },
      });
      expect(mockDestinoProductivoRepo.create).toHaveBeenCalledWith(entityToCreate);
      expect(mockDestinoProductivoRepo.save).toHaveBeenCalledWith(entityToCreate);
      expect(result).toEqual({ id: 10, nombre: nombreSanitizado });
    });
  });
});