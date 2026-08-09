import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoteUbicacionHistorialRepository } from '../repository/lote-ubicacion-historial.repository';
import { LoteUbicacionHistorial } from '../entities/lote-ubicacion-historial.entity';
/* eslint-disable @typescript-eslint/unbound-method */

describe('LoteUbicacionHistorialRepository', () => {
  let repository: LoteUbicacionHistorialRepository;
  let typeormRepoMock: jest.Mocked<Repository<LoteUbicacionHistorial>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoteUbicacionHistorialRepository,
        {
          provide: getRepositoryToken(LoteUbicacionHistorial),
          useValue: {
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<LoteUbicacionHistorialRepository>(
      LoteUbicacionHistorialRepository,
    );
    typeormRepoMock = module.get(getRepositoryToken(LoteUbicacionHistorial));
  });

  it('debe estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('debe guardar y retornar un registro de historial de ubicación', async () => {
      const mockRegistro = {
        id: 1,
        loteId: 10,
        empresaId: 2,
        sensorId: 3,
        ubicacion: 'TANQUE_A',
        ubicacionNueva: 'TANQUE_A',
        userId: 4,
        fecha: new Date('2026-07-31T10:00:00Z'),
      } as unknown as LoteUbicacionHistorial;

      typeormRepoMock.save.mockResolvedValue(mockRegistro);

      const resultado = await repository.create(mockRegistro);

      expect(typeormRepoMock.save).toHaveBeenCalledWith(mockRegistro);
      expect(resultado).toEqual(mockRegistro);
    });
  });

  describe('findUltimoPorLote', () => {
    it('debe buscar el último historial del lote ordenado por fecha DESC', async () => {
      const loteId = 10;
      const empresaId = 2;
      const mockHistorial = {
        id: 5,
        loteId,
        empresaId,
        fecha: new Date('2026-07-31T12:00:00Z'),
      } as LoteUbicacionHistorial;

      typeormRepoMock.findOne.mockResolvedValue(mockHistorial);

      const resultado = await repository.findUltimoPorLote(loteId, empresaId);

      expect(typeormRepoMock.findOne).toHaveBeenCalledWith({
        where: { loteId, empresaId },
        order: { fecha: 'DESC' },
      });
      expect(resultado).toEqual(mockHistorial);
    });

    it('debe retornar null si no se encuentra ningún historial para el lote', async () => {
      typeormRepoMock.findOne.mockResolvedValue(null);

      const resultado = await repository.findUltimoPorLote(99, 2);

      expect(typeormRepoMock.findOne).toHaveBeenCalledWith({
        where: { loteId: 99, empresaId: 2 },
        order: { fecha: 'DESC' },
      });
      expect(resultado).toBeNull();
    });
  });
});
