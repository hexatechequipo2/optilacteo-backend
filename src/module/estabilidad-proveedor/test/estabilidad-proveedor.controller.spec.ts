import { Test, TestingModule } from '@nestjs/testing';
import { EstabilidadProveedorController } from '../estabilidad-proveedor.controller';
import { EstabilidadProveedorService } from '../estabilidad-proveedor.service';
import { InternalApiKeyGuard } from '../../internal/guards/internal-api-key.guard';

describe('EstabilidadProveedorController', () => {
  let controller: EstabilidadProveedorController;
  let service: EstabilidadProveedorService;

  const mockEstabilidadProveedorService = {
    obtener: jest.fn(),
    recalcular: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstabilidadProveedorController],
      providers: [
        {
          provide: EstabilidadProveedorService,
          useValue: mockEstabilidadProveedorService,
        },
      ],
    })
      .overrideGuard(InternalApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EstabilidadProveedorController>(
      EstabilidadProveedorController,
    );
    service = module.get<EstabilidadProveedorService>(
      EstabilidadProveedorService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('obtenerEstabilidadProveedor', () => {
    it('debe llamar a estabilidadProveedorService.obtener con los parámetros correctos y retornar el resultado', async () => {
      const proveedorId = 10;
      const empresaId = 100;
      const resultadoMock = {
        proveedorId,
        empresaId,
        clasificacion: 'ESTABLE',
        score: 0.95,
      };

      mockEstabilidadProveedorService.obtener.mockResolvedValue(resultadoMock);

      const resultado = await controller.obtenerEstabilidadProveedor(
        proveedorId,
        empresaId,
      );

      expect(service.obtener).toHaveBeenCalledTimes(1);
      expect(service.obtener).toHaveBeenCalledWith(proveedorId, empresaId);
      expect(resultado).toEqual(resultadoMock);
    });
  });

  describe('recalcularEstabilidadProveedor', () => {
    it('debe ejecutar el recálculo en el servicio y retornar el mensaje de éxito estructurado', async () => {
      const proveedorId = 10;
      const empresaId = 100;

      mockEstabilidadProveedorService.recalcular.mockResolvedValue(undefined);

      const resultado = await controller.recalcularEstabilidadProveedor(
        proveedorId,
        empresaId,
      );

      expect(service.recalcular).toHaveBeenCalledTimes(1);
      expect(service.recalcular).toHaveBeenCalledWith(proveedorId, empresaId);
      expect(resultado).toEqual({
        mensaje: 'Recálculo de estabilidad ejecutado',
        proveedorId,
        empresaId,
      });
    });
  });
});