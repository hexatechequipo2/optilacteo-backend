import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SystemConfigService } from '../system-config.service';
import { SYSTEM_CONFIG_REPOSITORY } from '../repository/system-config-repository.interface';

const configMock = {
  id: 1,
  inactivityTimeout: 30,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

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
        {
          provide: SYSTEM_CONFIG_REPOSITORY,
          useValue: mockSystemConfigRepository,
        },
      ],
    }).compile();

    service = module.get<SystemConfigService>(SystemConfigService);
    jest.clearAllMocks();
  });

  describe('getConfig', () => {
    it('deberia retornar la configuracion del sistema cuando existe', async () => {
      // Arrange
      mockSystemConfigRepository.findConfig.mockResolvedValue(configMock);

      // Act
      const result = await service.getConfig();

      // Assert
      expect(result).toEqual(configMock);
      expect(mockSystemConfigRepository.findConfig).toHaveBeenCalled();
    });

    it('deberia lanzar NotFoundException cuando no existe configuracion', async () => {
      // Arrange
      mockSystemConfigRepository.findConfig.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getConfig()).rejects.toThrow(NotFoundException);
      await expect(service.getConfig()).rejects.toThrow(
        'Configuracion del sistema no encontrada',
      );
    });
  });

  describe('updateInactivityTimeout', () => {
    it('deberia actualizar el timeout de inactividad correctamente', async () => {
      // Arrange
      const dto = { inactivityTimeout: 15 };
      const updatedConfig = { ...configMock, inactivityTimeout: 15 };
      mockSystemConfigRepository.findConfig.mockResolvedValue(configMock);
      mockSystemConfigRepository.updateConfig.mockResolvedValue(updatedConfig);

      // Act
      const result = await service.updateInactivityTimeout(dto);

      // Assert
      expect(result).toEqual(updatedConfig);
      expect(mockSystemConfigRepository.updateConfig).toHaveBeenCalledWith({
        inactivityTimeout: 15,
      });
    });

    it('deberia lanzar NotFoundException cuando no existe configuracion al actualizar', async () => {
      // Arrange
      mockSystemConfigRepository.findConfig.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateInactivityTimeout({ inactivityTimeout: 15 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
