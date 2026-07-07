import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SystemConfigService } from '../system-config.service';
import { SYSTEM_CONFIG_REPOSITORY } from '../repository/system-config-repository.interface';
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

describe('SystemConfigService', () => {
  let service: SystemConfigService;
  let mockSystemConfigRepository: {
    findConfig: jest.Mock;
    updateConfig: jest.Mock;
  };

  beforeEach(async () => {
    mockSystemConfigRepository = {
      findConfig: jest.fn(),
      updateConfig: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemConfigService,
        { provide: SYSTEM_CONFIG_REPOSITORY, useValue: mockSystemConfigRepository },
      ],
    }).compile();

    service = module.get<SystemConfigService>(SystemConfigService);
  });

  describe('getConfig - consultar la configuracion actual (CU-04)', () => {
    it('deberia devolver la configuracion vigente, incluido el inactivityTimeout', async () => {
      mockSystemConfigRepository.findConfig.mockResolvedValue(buildConfig({ inactivityTimeout: 45 }));

      const result = await service.getConfig();

      expect(result.inactivityTimeout).toBe(45);
    });

    it('lanza NotFoundException si la configuracion no existe (flujo alternativo del CU-04)', async () => {
      mockSystemConfigRepository.findConfig.mockResolvedValue(null);

      await expect(service.getConfig()).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateInactivityTimeout - actualizar el tiempo de inactividad de forma global', () => {
    it('deberia persistir el nuevo inactivityTimeout y devolver la configuracion actualizada', async () => {
      mockSystemConfigRepository.findConfig.mockResolvedValue(buildConfig({ inactivityTimeout: 30 }));
      mockSystemConfigRepository.updateConfig.mockResolvedValue(buildConfig({ inactivityTimeout: 60 }));

      const result = await service.updateInactivityTimeout({ inactivityTimeout: 60 });

      expect(mockSystemConfigRepository.updateConfig).toHaveBeenCalledWith({ inactivityTimeout: 60 });
      expect(result.inactivityTimeout).toBe(60);
    });

    it('no es una configuracion por-usuario: no recibe ni filtra por ningun id de usuario/empresa', async () => {
      mockSystemConfigRepository.findConfig.mockResolvedValue(buildConfig());
      mockSystemConfigRepository.updateConfig.mockResolvedValue(buildConfig({ inactivityTimeout: 15 }));

      await service.updateInactivityTimeout({ inactivityTimeout: 15 });

      expect(mockSystemConfigRepository.updateConfig).toHaveBeenCalledWith({ inactivityTimeout: 15 });
      expect(mockSystemConfigRepository.updateConfig.mock.calls[0][0]).not.toHaveProperty('userId');
      expect(mockSystemConfigRepository.updateConfig.mock.calls[0][0]).not.toHaveProperty('empresaId');
    });

    it('lanza NotFoundException si la configuracion no existe, y no intenta actualizar (flujo alternativo)', async () => {
      mockSystemConfigRepository.findConfig.mockResolvedValue(null);

      await expect(
        service.updateInactivityTimeout({ inactivityTimeout: 60 }),
      ).rejects.toThrow(NotFoundException);
      expect(mockSystemConfigRepository.updateConfig).not.toHaveBeenCalled();
    });
  });
});
