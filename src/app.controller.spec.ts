import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let mockAppService: { getHello: jest.Mock };

  beforeEach(async () => {
    mockAppService = { getHello: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: mockAppService }],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  describe('getHello - health check publico', () => {
    it('deberia delegar en appService.getHello y devolver su resultado', () => {
      mockAppService.getHello.mockReturnValue('Hello World!');

      const result = controller.getHello();

      expect(mockAppService.getHello).toHaveBeenCalledWith();
      expect(result).toBe('Hello World!');
    });
  });
});
