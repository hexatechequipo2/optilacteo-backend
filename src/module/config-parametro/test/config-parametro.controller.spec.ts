import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ConfigParametroController } from '../config-parametro.controller';
import { ConfigParametroService } from '../config-parametro.service';

const mockService = {
  crear: jest.fn(),
  editar: jest.fn(),
  listarPorEmpresa: jest.fn(),
  eliminar: jest.fn(),
};

describe('ConfigParametroController', () => {
  let controller: ConfigParametroController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigParametroController],
      providers: [{ provide: ConfigParametroService, useValue: mockService }],
    }).compile();

    controller = module.get<ConfigParametroController>(ConfigParametroController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('cuando el usuario no tiene empresa asociada, debe lanzar ForbiddenException', () => {
      expect(() => controller.crear({ empresaId: null } as any, {} as any)).toThrow(
        ForbiddenException,
      );
      expect(mockService.crear).not.toHaveBeenCalled();
    });

    it('cuando el usuario tiene empresa asociada, debe delegar en el service con el empresaId del tenant', () => {
      const dto = { parametro: 'PH' } as any;
      mockService.crear.mockReturnValue({ id: 1 });

      const resultado = controller.crear({ empresaId: 5 } as any, dto);

      expect(mockService.crear).toHaveBeenCalledWith(5, dto);
      expect(resultado).toEqual({ id: 1 });
    });
  });

  describe('editar', () => {
    it('cuando el usuario no tiene empresa asociada, debe lanzar ForbiddenException', () => {
      expect(() => controller.editar({ empresaId: null } as any, 1, {} as any)).toThrow(
        ForbiddenException,
      );
      expect(mockService.editar).not.toHaveBeenCalled();
    });

    it('cuando el usuario tiene empresa asociada, debe delegar en el service', () => {
      const dto = { umbralMin: 1 } as any;
      mockService.editar.mockReturnValue({ id: 1 });

      const resultado = controller.editar({ empresaId: 5 } as any, 1, dto);

      expect(mockService.editar).toHaveBeenCalledWith(5, 1, dto);
      expect(resultado).toEqual({ id: 1 });
    });
  });

  describe('listar', () => {
    it('cuando el usuario no tiene empresa asociada, debe lanzar ForbiddenException', () => {
      expect(() => controller.listar({ empresaId: null } as any)).toThrow(ForbiddenException);
      expect(mockService.listarPorEmpresa).not.toHaveBeenCalled();
    });

    it('cuando el usuario tiene empresa asociada, debe delegar en el service', () => {
      const tenant = { empresaId: 5 } as any;
      mockService.listarPorEmpresa.mockReturnValue([{ id: 1 }]);

      const resultado = controller.listar(tenant);

      expect(mockService.listarPorEmpresa).toHaveBeenCalledWith(5, tenant);
      expect(resultado).toEqual([{ id: 1 }]);
    });
  });

  describe('eliminar', () => {
    it('cuando el usuario no tiene empresa asociada, debe lanzar ForbiddenException', () => {
      expect(() => controller.eliminar({ empresaId: null } as any, 1)).toThrow(ForbiddenException);
      expect(mockService.eliminar).not.toHaveBeenCalled();
    });

    it('cuando el usuario tiene empresa asociada, debe delegar en el service', () => {
      mockService.eliminar.mockReturnValue({ message: 'ok' });

      const resultado = controller.eliminar({ empresaId: 5 } as any, 1);

      expect(mockService.eliminar).toHaveBeenCalledWith(5, 1);
      expect(resultado).toEqual({ message: 'ok' });
    });
  });
});