import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ConfiguracionComparacionHistoricaController } from '../configuracion-comparacion-historica.controller';
import { ConfiguracionComparacionHistoricaService } from '../configuracion-comparacion-historica.service';

/* eslint-disable @typescript-eslint/no-unsafe-argument */

const mockService = {
  getConfig: jest.fn(),
  update: jest.fn(),
};

describe('ConfiguracionComparacionHistoricaController', () => {
  let controller: ConfiguracionComparacionHistoricaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfiguracionComparacionHistoricaController],
      providers: [
        {
          provide: ConfiguracionComparacionHistoricaService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ConfiguracionComparacionHistoricaController>(
      ConfiguracionComparacionHistoricaController,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('get', () => {
    it('cuando el usuario no tiene empresa asociada, debe lanzar ForbiddenException', () => {
      expect(() => controller.get({ empresaId: null } as any)).toThrow(
        ForbiddenException,
      );
      expect(mockService.getConfig).not.toHaveBeenCalled();
    });

    it('cuando el usuario tiene empresa asociada, debe delegar en el service', () => {
      mockService.getConfig.mockReturnValue({
        desvioSignificativoPorcentaje: 15,
      });

      const resultado = controller.get({ empresaId: 5 } as any);

      expect(mockService.getConfig).toHaveBeenCalledWith(5);
      expect(resultado).toEqual({ desvioSignificativoPorcentaje: 15 });
    });
  });

  describe('update', () => {
    it('cuando el usuario no tiene empresa asociada, debe lanzar ForbiddenException', () => {
      expect(() =>
        controller.update({ empresaId: null } as any, {} as any),
      ).toThrow(ForbiddenException);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it('cuando el usuario tiene empresa asociada, debe delegar en el service con el dto recibido', () => {
      const dto = { desvioSignificativoPorcentaje: 25 };
      mockService.update.mockReturnValue({ desvioSignificativoPorcentaje: 25 });

      const resultado = controller.update({ empresaId: 5 } as any, dto);

      expect(mockService.update).toHaveBeenCalledWith(5, dto);
      expect(resultado).toEqual({ desvioSignificativoPorcentaje: 25 });
    });
  });
});
