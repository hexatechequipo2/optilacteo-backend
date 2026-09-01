import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionNotificacionRepository } from '../repository/configuracion-notificacion-nivel.repository';
import { ConfiguracionNotificacionNivel } from '../entities/configuracion-notificacion-nivel.entity';
import { NivelAlerta } from '../enums/nivel-alerta.enum';

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

describe('ConfiguracionNotificacionRepository', () => {
  let repository: ConfiguracionNotificacionRepository;
  let typeOrmRepository: jest.Mocked<
    Repository<ConfiguracionNotificacionNivel>
  >;

  const mockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfiguracionNotificacionRepository,
        {
          provide: getRepositoryToken(ConfiguracionNotificacionNivel),
          useValue: mockRepo,
        },
      ],
    }).compile();

    repository = module.get<ConfiguracionNotificacionRepository>(
      ConfiguracionNotificacionRepository,
    );
    typeOrmRepository = module.get(
      getRepositoryToken(ConfiguracionNotificacionNivel),
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('findByEmpresa: debe retornar las configuraciones ordenadas por nivelAlerta', async () => {
    typeOrmRepository.find.mockResolvedValue([]);

    await repository.findByEmpresa(10);

    expect(typeOrmRepository.find).toHaveBeenCalledWith({
      where: { empresaId: 10 },
      relations: { rol: true, usuario: true },
      order: { nivelAlerta: 'ASC' },
    });
  });

  it('findById: debe buscar por id y empresaId', async () => {
    typeOrmRepository.findOne.mockResolvedValue(null);

    await repository.findById(1, 10);

    expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
      where: { id: 1, empresaId: 10 },
    });
  });

  it('findDestinatariosConfigByNivel: debe mapear correctamente los rolIds y usuarioIds', async () => {
    const rowsMock = [
      { rolId: 2, usuarioId: null },
      { rolId: null, usuarioId: 5 },
      { rolId: 3, usuarioId: null },
    ];

    const qbMock: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(rowsMock),
    };

    typeOrmRepository.createQueryBuilder.mockReturnValue(qbMock);

    const result = await repository.findDestinatariosConfigByNivel(
      10,
      NivelAlerta.CRITICA,
    );

    expect(qbMock.where).toHaveBeenCalledWith('config.empresaId = :empresaId', {
      empresaId: 10,
    });
    expect(qbMock.andWhere).toHaveBeenCalledWith(
      'config.nivelAlerta = :nivelAlerta',
      { nivelAlerta: NivelAlerta.CRITICA },
    );
    expect(result).toEqual({
      rolIds: [2, 3],
      usuarioIds: [5],
    });
  });

  it('countByNivel: debe retornar la cantidad por nivel', async () => {
    typeOrmRepository.count.mockResolvedValue(3);

    const count = await repository.countByNivel(10, NivelAlerta.ADVERTENCIA);

    expect(typeOrmRepository.count).toHaveBeenCalledWith({
      where: { empresaId: 10, nivelAlerta: NivelAlerta.ADVERTENCIA },
    });
    expect(count).toBe(3);
  });

  it('create: debe crear y guardar la entidad', async () => {
    const dto = { empresaId: 10, nivelAlerta: NivelAlerta.CRITICA };
    typeOrmRepository.create.mockReturnValue(dto as any);
    typeOrmRepository.save.mockResolvedValue({ id: 1, ...dto } as any);

    const result = await repository.create(dto);

    expect(typeOrmRepository.create).toHaveBeenCalledWith(dto);
    expect(typeOrmRepository.save).toHaveBeenCalledWith(dto);
    expect(result.id).toBe(1);
  });

  it('delete: debe retornar true si afectó filas y false si no', async () => {
    typeOrmRepository.delete.mockResolvedValueOnce({ affected: 1, raw: [] });
    let result = await repository.delete(1, 10);
    expect(result).toBe(true);

    typeOrmRepository.delete.mockResolvedValueOnce({ affected: 0, raw: [] });
    result = await repository.delete(1, 10);
    expect(result).toBe(false);
  });
});
