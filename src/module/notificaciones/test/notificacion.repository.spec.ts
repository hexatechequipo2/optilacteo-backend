import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificacionRepository } from '../repository/notificacion.repository';
import { Notificacion } from '../entities/notificacion.entity';
import { TipoNotificacion } from '../enums/tipo-notificacion.enum';
import { EstadoAlerta } from '../enums/estado-alerta.enum';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { NivelAlerta } from '../enums/nivel-alerta.enum';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

describe('NotificacionRepository', () => {
  let repository: NotificacionRepository;
  let typeOrmRepository: jest.Mocked<Repository<Notificacion>>;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacionRepository,
        {
          provide: getRepositoryToken(Notificacion),
          useValue: mockRepo,
        },
      ],
    }).compile();

    repository = module.get<NotificacionRepository>(NotificacionRepository);
    typeOrmRepository = module.get(getRepositoryToken(Notificacion));
  });

  afterEach(() => jest.clearAllMocks());

  it('create: debe instanciar y guardar la notificación', async () => {
    const dto = { mensaje: 'Prueba' };
    typeOrmRepository.create.mockReturnValue(dto as any);
    typeOrmRepository.save.mockResolvedValue({ id: 1, ...dto } as any);

    const result = await repository.create(dto);

    expect(typeOrmRepository.create).toHaveBeenCalledWith(dto);
    expect(typeOrmRepository.save).toHaveBeenCalled();
    expect(result.id).toBe(1);
  });

  it('findByUsuario: debe aplicar paginación y orden', async () => {
    typeOrmRepository.findAndCount.mockResolvedValue([[], 0]);

    await repository.findByUsuario(1, 10, { page: 2, limit: 10 });

    expect(typeOrmRepository.findAndCount).toHaveBeenCalledWith({
      where: { usuarioId: 1, empresaId: 10 },
      order: { createdAt: 'DESC' },
      skip: 10,
      take: 10,
    });
  });

  it('markAsLeida: debe retornar null si no se actualizó nada', async () => {
    typeOrmRepository.update.mockResolvedValue({
      affected: 0,
      raw: [],
      generatedMaps: [],
    });

    const result = await repository.markAsLeida(1, 2, 10);

    expect(result).toBeNull();
  });

  it('markAsLeida: debe actualizar y retornar la entidad', async () => {
    typeOrmRepository.update.mockResolvedValue({
      affected: 1,
      raw: [],
      generatedMaps: [],
    });
    typeOrmRepository.findOne.mockResolvedValue({ id: 1, leida: true } as any);

    const result = await repository.markAsLeida(1, 2, 10);

    expect(typeOrmRepository.update).toHaveBeenCalledWith(
      { id: 1, usuarioId: 2, empresaId: 10 },
      { leida: true },
    );
    expect(result).toEqual({ id: 1, leida: true });
  });

  it('countNoLeidas: debe contar notificaciones no leídas', async () => {
    typeOrmRepository.count.mockResolvedValue(5);

    const count = await repository.countNoLeidas(1, 10);

    expect(typeOrmRepository.count).toHaveBeenCalledWith({
      where: { usuarioId: 1, empresaId: 10, leida: false },
    });
    expect(count).toBe(5);
  });

  it('findAlertaAbiertaPorLoteYParametro: debe buscar por estado ABIERTA', async () => {
    typeOrmRepository.findOne.mockResolvedValue(null);

    await repository.findAlertaAbiertaPorLoteYParametro(
      10,
      100,
      Parametro.TEMPERATURA,
    );

    expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
      where: {
        empresaId: 10,
        loteId: 100,
        parametro: Parametro.TEMPERATURA,
        tipo: TipoNotificacion.ALERTA_UMBRAL,
        estado: EstadoAlerta.ABIERTA,
      },
    });
  });

  it('resolver: debe actualizar a estado CERRADA y retornar entidad con relaciones', async () => {
    typeOrmRepository.update.mockResolvedValue({
      affected: 1,
      raw: [],
      generatedMaps: [],
    });
    typeOrmRepository.findOne.mockResolvedValue({
      id: 1,
      estado: EstadoAlerta.CERRADA,
    } as any);

    const result = await repository.resolver(1, 10, 'Acción tomada', 5);

    expect(typeOrmRepository.update).toHaveBeenCalledWith(
      {
        id: 1,
        empresaId: 10,
        tipo: TipoNotificacion.ALERTA_UMBRAL,
        estado: EstadoAlerta.ABIERTA,
      },
      {
        estado: EstadoAlerta.CERRADA,
        accionCorrectiva: 'Acción tomada',
        resueltaPorId: 5,
        fechaResolucion: expect.any(Date),
      },
    );
    expect(result).toBeDefined();
  });

  describe('Query Historial (findHistorial / findHistorialCompleto)', () => {
    let qbMock: any;

    beforeEach(() => {
      qbMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getMany: jest.fn().mockResolvedValue([]),
        getSql: jest.fn().mockReturnValue('SELECT *'),
        getParameters: jest.fn().mockReturnValue({}),
      };
      typeOrmRepository.createQueryBuilder.mockReturnValue(qbMock);
    });

    it('findHistorial: debe construir la query con todos los filtros condicionales', async () => {
      const query = {
        estado: EstadoAlerta.ABIERTA,
        loteId: 5,
        nivelAlerta: NivelAlerta.CRITICA,
        fechaInicio: '2026-08-01',
        fechaFin: '2026-08-12',
        page: 1,
        limit: 10,
      };

      await repository.findHistorial(10, query);

      expect(qbMock.where).toHaveBeenCalledWith(
        'notificacion.empresaId = :empresaId',
        { empresaId: 10 },
      );
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'notificacion.estado = :estado',
        { estado: EstadoAlerta.ABIERTA },
      );
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'notificacion.loteId = :loteId',
        { loteId: 5 },
      );
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'notificacion.nivelAlerta = :nivelAlerta',
        { nivelAlerta: NivelAlerta.CRITICA },
      );
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'notificacion.createdAt >= :fechaInicio',
        { fechaInicio: expect.any(Date) },
      );
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'notificacion.createdAt <= :fechaFin',
        { fechaFin: expect.any(Date) },
      );
      expect(qbMock.skip).toHaveBeenCalledWith(0);
      expect(qbMock.take).toHaveBeenCalledWith(10);
    });

    it('findHistorialCompleto: debe ejecutar la query sin aplicar paginación', async () => {
      await repository.findHistorialCompleto(10, {});

      expect(qbMock.getMany).toHaveBeenCalled();
      expect(qbMock.skip).not.toHaveBeenCalled();
      expect(qbMock.take).not.toHaveBeenCalled();
    });
  });

  it('findAlertaAbiertaPorSensor: debe buscar por sensor y estado ABIERTA', async () => {
    typeOrmRepository.findOne.mockResolvedValue(null);

    await repository.findAlertaAbiertaPorSensor(
      10,
      3,
      TipoNotificacion.ALERTA_SENSOR_DESCONECTADO,
    );

    expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
      where: {
        empresaId: 10,
        sensorId: 3,
        tipo: TipoNotificacion.ALERTA_SENSOR_DESCONECTADO,
        estado: EstadoAlerta.ABIERTA,
      },
    });
  });

  it('cerrarAlertasAbiertasPorSensor: debe ejecutar update con estado CERRADA', async () => {
    typeOrmRepository.update.mockResolvedValue({
      affected: 1,
      raw: [],
      generatedMaps: [],
    });

    await repository.cerrarAlertasAbiertasPorSensor(
      10,
      3,
      TipoNotificacion.ALERTA_SENSOR_DESCONECTADO,
    );

    expect(typeOrmRepository.update).toHaveBeenCalledWith(
      {
        empresaId: 10,
        sensorId: 3,
        tipo: TipoNotificacion.ALERTA_SENSOR_DESCONECTADO,
        estado: EstadoAlerta.ABIERTA,
      },
      {
        estado: EstadoAlerta.CERRADA,
        fechaResolucion: expect.any(Date),
      },
    );
  });
});
