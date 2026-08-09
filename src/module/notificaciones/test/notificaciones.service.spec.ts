import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { NotificacionesService } from '../notificaciones.service';
import { User } from '../../user/entities/user.entity';
import { ROLES } from '../../rol/constants/roles.constants';
import { NotificacionesGateway } from '../gateway/notificaciones.gateway';
import { TipoNotificacion } from '../enums/tipo-notificacion.enum';
import {
  NOTIFICACION_REPOSITORY,
  INotificacionRepository,
} from '../repository/notificacion.repository.interface';
import { NotificacionFilterQueryDto } from '../dto/notificacion-filter-query.dto';
import { Notificacion } from '../entities/notificacion.entity';
/* eslint-disable @typescript-eslint/unbound-method */

describe('NotificacionesService', () => {
  let service: NotificacionesService;
  let notificacionRepositoryMock: jest.Mocked<INotificacionRepository>;
  let userRepositoryMock: jest.Mocked<Repository<User>>;
  let gatewayMock: jest.Mocked<NotificacionesGateway>;

  beforeEach(async () => {
    notificacionRepositoryMock = {
      create: jest.fn(),
      findByUsuario: jest.fn(),
      findById: jest.fn(),
      markAsLeida: jest.fn(),
    };
    userRepositoryMock = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;
    gatewayMock = {
      emitirNotificacion: jest.fn(),
    } as unknown as jest.Mocked<NotificacionesGateway>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacionesService,
        {
          provide: NOTIFICACION_REPOSITORY,
          useValue: notificacionRepositoryMock,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepositoryMock,
        },
        {
          provide: NotificacionesGateway,
          useValue: gatewayMock,
        },
      ],
    }).compile();

    service = module.get<NotificacionesService>(NotificacionesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('notificarResponsablesCalidad', () => {
    const empresaId = 1;
    const tipo = 'ALERTA' as TipoNotificacion;
    const mensaje = 'Alerta de temperatura fuera de rango';
    const data = { loteId: 10 };

    it('debe buscar usuarios responsables de calidad activos y emitirles notificaciones a cada uno', async () => {
      const mockResponsables = [
        { id: 101, email: 'resp1@test.com' },
        { id: 102, email: 'resp2@test.com' },
      ] as User[];

      userRepositoryMock.find.mockResolvedValue(mockResponsables);

      notificacionRepositoryMock.create.mockImplementation(
        (entity: Partial<Notificacion>) =>
          Promise.resolve({
            id: Math.floor(Math.random() * 1000) + 1,
            ...entity,
            leida: false,
            createdAt: new Date(),
          } as unknown as Notificacion),
      );

      await service.notificarResponsablesCalidad(
        empresaId,
        tipo,
        mensaje,
        data,
      );

      expect(userRepositoryMock.find).toHaveBeenCalledWith({
        where: {
          empresa: { id: empresaId },
          rol: { nombre: ROLES.RESPONSABLE_CALIDAD },
          isActive: true,
        },
        relations: { rol: true, empresa: true },
      });

      expect(notificacionRepositoryMock.create).toHaveBeenCalledTimes(2);
      expect(gatewayMock.emitirNotificacion).toHaveBeenCalledTimes(2);

      // Verificación para el primer usuario
      expect(notificacionRepositoryMock.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          tipo,
          mensaje,
          data,
          usuarioId: 101,
          empresaId,
        }),
      );
      expect(gatewayMock.emitirNotificacion).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          tipo,
          mensaje,
        }),
        empresaId,
        101,
      );

      // Verificación para el segundo usuario
      expect(notificacionRepositoryMock.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          tipo,
          mensaje,
          data,
          usuarioId: 102,
          empresaId,
        }),
      );
      expect(gatewayMock.emitirNotificacion).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          tipo,
          mensaje,
        }),
        empresaId,
        102,
      );
    });

    it('no debe guardar ni emitir notificaciones si no hay usuarios responsables de calidad activos', async () => {
      userRepositoryMock.find.mockResolvedValue([]);

      await service.notificarResponsablesCalidad(
        empresaId,
        tipo,
        mensaje,
        data,
      );

      expect(userRepositoryMock.find).toHaveBeenCalled();
      expect(notificacionRepositoryMock.create).not.toHaveBeenCalled();
      expect(gatewayMock.emitirNotificacion).not.toHaveBeenCalled();
    });
  });

  describe('listarPorUsuario', () => {
    it('debe obtener las notificaciones paginadas del repositorio y devolver la respuesta con la estructura del mapper', async () => {
      const usuarioId = 42;
      const empresaId = 1;
      const query: NotificacionFilterQueryDto = { page: 1, limit: 10 };

      const mockEntities = [
        {
          id: 1,
          tipo: 'ALERTA' as TipoNotificacion,
          mensaje: 'Notificación 1',
          leida: false,
          createdAt: new Date(),
        },
        {
          id: 2,
          tipo: 'INFO' as TipoNotificacion,
          mensaje: 'Notificación 2',
          leida: true,
          createdAt: new Date(),
        },
      ] as Notificacion[];

      notificacionRepositoryMock.findByUsuario.mockResolvedValue([
        mockEntities,
        2,
      ]);

      const result = await service.listarPorUsuario(
        usuarioId,
        empresaId,
        query,
      );

      expect(notificacionRepositoryMock.findByUsuario).toHaveBeenCalledWith(
        usuarioId,
        empresaId,
        query,
      );

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 2);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('marcarLeida', () => {
    const id = 5;
    const usuarioId = 42;
    const empresaId = 1;

    it('debe marcar como leída y devolver la DTO mapeada si existe', async () => {
      const mockUpdatedEntity = {
        id,
        tipo: 'ALERTA' as TipoNotificacion,
        mensaje: 'Notificación leída',
        leida: true,
        usuarioId,
        empresaId,
        createdAt: new Date(),
      } as unknown as Notificacion;

      notificacionRepositoryMock.markAsLeida.mockResolvedValue(
        mockUpdatedEntity,
      );

      const result = await service.marcarLeida(id, usuarioId, empresaId);

      expect(notificacionRepositoryMock.markAsLeida).toHaveBeenCalledWith(
        id,
        usuarioId,
        empresaId,
      );
      expect(result.id).toBe(id);
      expect(result.leida).toBe(true);
    });

    it('debe lanzar NotFoundException si la notificación no existe o no se actualizó', async () => {
      notificacionRepositoryMock.markAsLeida.mockResolvedValue(null);

      await expect(
        service.marcarLeida(id, usuarioId, empresaId),
      ).rejects.toThrow(NotFoundException);

      expect(notificacionRepositoryMock.markAsLeida).toHaveBeenCalledWith(
        id,
        usuarioId,
        empresaId,
      );
    });
  });
});
