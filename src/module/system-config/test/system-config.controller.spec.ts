import { Test, TestingModule } from '@nestjs/testing';
import { SystemConfigController } from '../system-config.controller';
import { SystemConfigService } from '../system-config.service';

describe('SystemConfigController', () => {
  let controller: SystemConfigController;
  let mockSystemConfigService: {
    getConfig: jest.Mock;
    updateInactivityTimeout: jest.Mock;
  };

  beforeEach(async () => {
    mockSystemConfigService = {
      getConfig: jest.fn(),
      updateInactivityTimeout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemConfigController],
      providers: [{ provide: SystemConfigService, useValue: mockSystemConfigService }],
    }).compile();

    controller = module.get<SystemConfigController>(SystemConfigController);
  });

  describe('getInactivityTimeout', () => {
    it('deberia delegar en systemConfigService.getConfig y devolver su resultado', async () => {
      const config = { id: 1, inactivityTimeout: 30 };
      mockSystemConfigService.getConfig.mockResolvedValue(config);

      const result = await controller.getInactivityTimeout();

      expect(mockSystemConfigService.getConfig).toHaveBeenCalledWith();
      expect(result).toBe(config);
    });
  });

  describe('updateInactivityTimeout', () => {
    it('deberia delegar en systemConfigService.updateInactivityTimeout con el DTO recibido en el body', async () => {
      const dto = { inactivityTimeout: 60 };
      mockSystemConfigService.updateInactivityTimeout.mockResolvedValue({ id: 1, ...dto });

      await controller.updateInactivityTimeout(dto as never);

      expect(mockSystemConfigService.updateInactivityTimeout).toHaveBeenCalledWith(dto);
    });
  });
});
