import { Test, TestingModule } from '@nestjs/testing';
import { PlanesController } from '../planes.controller';
import { EmpresaService } from '../empresa.service';

// PlanesController hoy solo expone GET /planes (listado con precio, cantidad
// de empresas y modulos), delegando en EmpresaService.getResumenPlanes().
// No hay creacion/edicion/eliminacion de planes: Plan es un enum fijo y
// DETALLE_POR_PLAN un config estatico (ver empresa/enums/plan.enum.ts y
// empresa/config/plan-detalles.config.ts), no una entidad de base de datos.

describe('PlanesController', () => {
  let controller: PlanesController;
  let mockEmpresaService: {
    getResumenPlanes: jest.Mock;
  };

  beforeEach(async () => {
    mockEmpresaService = {
      getResumenPlanes: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanesController],
      providers: [{ provide: EmpresaService, useValue: mockEmpresaService }],
    }).compile();

    controller = module.get<PlanesController>(PlanesController);
  });

  describe('findAll', () => {
    it('deberia delegar en empresaService.getResumenPlanes y devolver su resultado tal cual', async () => {
      const resumen = [
        { id: 1, nombre: 'Starter', precio: 20, empresasAsignadas: 2, modulos: [] },
      ];
      mockEmpresaService.getResumenPlanes.mockResolvedValue(resumen);

      const result = await controller.findAll();

      expect(mockEmpresaService.getResumenPlanes).toHaveBeenCalledWith();
      expect(result).toBe(resumen);
    });
  });
});
