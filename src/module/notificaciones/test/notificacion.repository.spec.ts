import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { NotificacionRepository } from '../repository/notificacion.repository';
import { Notificacion } from '../entities/notificacion.entity';
import { NotificacionFilterQueryDto } from '../dto/notificacion-filter-query.dto';

describe('NotificacionRepository', () => {
  let repository: NotificacionRepository;
  let typeormRepoMock: jest.Mocked<Repository<Notificacion>>;

  beforeEach(async () => {
    typeormRepoMock = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<Notificacion>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacionRepository,
        {
          provide: getRepositoryToken(Notificacion),
          useValue: typeormRepoMock,
        },
      ],
    }).compile();

    repository = module.get<NotificacionRepository>(NotificacionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('debe instanciar y guardar una nueva notificación', async () => {
      const partialData: Partial<Notificacion> = {
        mensaje: 'Prueba de notificación',
        usuarioId: 1,
        empresaId: 10,
      };

      const entityMock = { id: 100, ...partialData } as Notificacion;

      typeormRepoMock.create.mockReturnValue(entityMock);
      typeormRepoMock.save.mockResolvedValue(entityMock);

      const result = await repository.create(partialData);

      expect(typeormRepoMock.create).toHaveBeenCalledWith(partialData);
      expect(typeormRepoMock.save).toHaveBeenCalledWith(entityMock);
      expect(result).toBe(entityMock);
    });
  });

  describe('findByUsuario', () => {
    const usuarioId = 1;
    const empresaId = 10;

    it('debe buscar y contar notificaciones aplicando paginación explícita y orden descendente', async () => {
      const query: NotificacionFilterQueryDto = {
        page: 2,
        limit: 10,
      };

      const expectedList = [{ id: 1 }, { id: 2 }] as Notificacion[];
      const expectedTotal = 15;

      typeormRepoMock.findAndCount.mockResolvedValue([
        expectedList,
        expectedTotal,
      ]);

      const result = await repository.findByUsuario(
        usuarioId,
        empresaId,
        query,
      );

      expect(typeormRepoMock.findAndCount).toHaveBeenCalledWith({
        where: { usuarioId, empresaId },
        order: { createdAt: 'DESC' },
        skip: 10, // (2 - 1) * 10
        take: 10,
      });
      expect(result).toEqual([expectedList, expectedTotal]);
    });

    it('debe usar valores por defecto para page=1 y limit=20 si la query no los define', async () => {
      const query: NotificacionFilterQueryDto = {};

      typeormRepoMock.findAndCount.mockResolvedValue([[], 0]);

      await repository.findByUsuario(usuarioId, empresaId, query);

      expect(typeormRepoMock.findAndCount).toHaveBeenCalledWith({
        where: { usuarioId, empresaId },
        order: { createdAt: 'DESC' },
        skip: 0, // (1 - 1) * 20
        take: 20,
      });
    });
  });

  describe('findById', () => {
    it('debe buscar una notificación por id y empresaId', async () => {
      const id = 5;
      const empresaId = 10;
      const expectedNotificacion = { id, empresaId } as Notificacion;

      typeormRepoMock.findOne.mockResolvedValue(expectedNotificacion);

      const result = await repository.findById(id, empresaId);

      expect(typeormRepoMock.findOne).toHaveBeenCalledWith({
        where: { id, empresaId },
      });
      expect(result).toBe(expectedNotificacion);
    });

    it('debe devolver null si no encuentra la notificación', async () => {
      typeormRepoMock.findOne.mockResolvedValue(null);

      const result = await repository.findById(999, 10);

      expect(result).toBeNull();
    });
  });

  describe('markAsLeida', () => {
    const id = 5;
    const usuarioId = 1;
    const empresaId = 10;

    it('debe actualizar leida a true y devolver la entidad actualizada', async () => {
      const updateResult: UpdateResult = {
        affected: 1,
        raw: [],
        generatedMaps: [],
      };

      const notificacionActualizada = {
        id,
        usuarioId,
        empresaId,
        leida: true,
      } as Notificacion;

      typeormRepoMock.update.mockResolvedValue(updateResult);
      typeormRepoMock.findOne.mockResolvedValue(notificacionActualizada);

      const result = await repository.markAsLeida(id, usuarioId, empresaId);

      expect(typeormRepoMock.update).toHaveBeenCalledWith(
        { id, usuarioId, empresaId },
        { leida: true },
      );
      expect(typeormRepoMock.findOne).toHaveBeenCalledWith({
        where: { id, usuarioId, empresaId },
      });
      expect(result).toEqual(notificacionActualizada);
    });

    it('debe retornar null si no se afectó ninguna fila durante el update', async () => {
      const updateResult: UpdateResult = {
        affected: 0,
        raw: [],
        generatedMaps: [],
      };

      typeormRepoMock.update.mockResolvedValue(updateResult);

      const result = await repository.markAsLeida(id, usuarioId, empresaId);

      expect(typeormRepoMock.update).toHaveBeenCalledWith(
        { id, usuarioId, empresaId },
        { leida: true },
      );
      expect(typeormRepoMock.findOne).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});
