import { Repository } from 'typeorm';
import { SystemConfigRepository } from '../repository/system-config.repository';
import { SystemConfig } from '../entities/system-config.entity';

function buildConfig(overrides: Partial<SystemConfig> = {}): SystemConfig {
  return {
    id: 1,
    inactivityTimeout: 30,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('SystemConfigRepository', () => {
  let repository: SystemConfigRepository;
  let mockTypeormRepo: {
    findOne: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(() => {
    mockTypeormRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };
    repository = new SystemConfigRepository(
      mockTypeormRepo as unknown as Repository<SystemConfig>,
    );
  });

  describe('findConfig - config unica de plataforma (fila id:1)', () => {
    it('deberia buscar siempre la fila con id 1', async () => {
      mockTypeormRepo.findOne.mockResolvedValue(buildConfig());

      await repository.findConfig();

      expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('deberia devolver null si la fila de configuracion no existe', async () => {
      mockTypeormRepo.findOne.mockResolvedValue(null);

      const result = await repository.findConfig();

      expect(result).toBeNull();
    });
  });

  describe('updateConfig - actualizacion global (misma fila id:1 para todos)', () => {
    it('deberia actualizar siempre la fila id 1 y devolver la configuracion recargada', async () => {
      mockTypeormRepo.update.mockResolvedValue({ affected: 1 });
      mockTypeormRepo.findOne.mockResolvedValue(buildConfig({ inactivityTimeout: 60 }));

      const result = await repository.updateConfig({ inactivityTimeout: 60 });

      expect(mockTypeormRepo.update).toHaveBeenCalledWith(1, { inactivityTimeout: 60 });
      expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result.inactivityTimeout).toBe(60);
    });
  });
});
