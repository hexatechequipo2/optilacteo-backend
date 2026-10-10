import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SensorLecturaRepository } from '../repository/sensor-lectura.repository';
import { SensorLectura } from '../entities/sensor-lectura.entity';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

describe('SensorLecturaRepository', () => {
  let repository: SensorLecturaRepository;
  let qb: any;

  const repoMock = { save: jest.fn(), createQueryBuilder: jest.fn() };

  const crearQb = () => {
    const q: any = {};
    ['innerJoinAndSelect', 'innerJoin', 'where', 'andWhere', 'orderBy', 'skip', 'take', 'select'].forEach(
      (m) => (q[m] = jest.fn().mockReturnValue(q)),
    );
    q.getManyAndCount = jest.fn();
    q.getMany = jest.fn();
    q.getRawMany = jest.fn();
    return q;
  };

  beforeEach(async () => {
    qb = crearQb();
    repoMock.save.mockReset();
    repoMock.createQueryBuilder.mockReset().mockReturnValue(qb);

    const module = await Test.createTestingModule({
      providers: [
        SensorLecturaRepository,
        { provide: getRepositoryToken(SensorLectura), useValue: repoMock },
      ],
    }).compile();

    repository = module.get(SensorLecturaRepository);
  });

  it('create guarda la lectura', async () => {
    const lectura = { id: 1 } as SensorLectura;
    repoMock.save.mockResolvedValue(lectura);

    await expect(repository.create(lectura)).resolves.toBe(lectura);
    expect(repoMock.save).toHaveBeenCalledWith(lectura);
  });

  describe('findHistorial', () => {
    it('filtra solo por empresa y pagina cuando no hay filtros opcionales', async () => {
      qb.getManyAndCount.mockResolvedValue([[{ id: 1 }], 1]);

      const res = await repository.findHistorial({ page: 3, limit: 10 } as any, 7);

      expect(res).toEqual([[{ id: 1 }], 1]);
      expect(qb.where).toHaveBeenCalledWith('lectura.empresaId = :empresaId', { empresaId: 7 });
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.orderBy).toHaveBeenCalledWith('lectura.timestampLectura', 'DESC');
      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('aplica loteId (incluido 0), fechaInicio y fechaFin', async () => {
      const fechaInicio = new Date('2026-08-01');
      const fechaFin = new Date('2026-08-31');
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await repository.findHistorial({ page: 1, limit: 5, loteId: 0, fechaInicio, fechaFin } as any, 7);

      expect(qb.andWhere).toHaveBeenCalledWith('lectura.loteId = :loteId', { loteId: 0 });
      expect(qb.andWhere).toHaveBeenCalledWith('lectura.timestampLectura >= :fechaInicio', { fechaInicio });
      expect(qb.andWhere).toHaveBeenCalledWith('lectura.timestampLectura <= :fechaFin', { fechaFin });
    });
  });

  it('findHistorialCompleto devuelve todo sin paginar', async () => {
    qb.getMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const res = await repository.findHistorialCompleto({ loteId: 4 } as any, 7);

    expect(res).toHaveLength(2);
    expect(qb.andWhere).toHaveBeenCalledWith('lectura.loteId = :loteId', { loteId: 4 });
    expect(qb.skip).not.toHaveBeenCalled();
    expect(qb.take).not.toHaveBeenCalled();
  });

  describe('findUltimosValores', () => {
    it('devuelve los valores como número en orden cronológico ascendente', async () => {
      qb.getRawMany.mockResolvedValue([{ valor: '3.5' }, { valor: '2' }, { valor: '1' }]);

      const res = await repository.findUltimosValores(4, Parametro.PH, 7, 3);

      expect(res).toEqual([1, 2, 3.5]);
      expect(qb.andWhere).toHaveBeenCalledWith('lectura.loteId = :loteId', { loteId: 4 });
      expect(qb.andWhere).toHaveBeenCalledWith('sensor.parametro = :parametro', { parametro: Parametro.PH });
      expect(qb.take).toHaveBeenCalledWith(3);
    });

    it('devuelve [] si no hay lecturas', async () => {
      qb.getRawMany.mockResolvedValue([]);

      await expect(repository.findUltimosValores(4, Parametro.PH, 7, 3)).resolves.toEqual([]);
    });
  });
});