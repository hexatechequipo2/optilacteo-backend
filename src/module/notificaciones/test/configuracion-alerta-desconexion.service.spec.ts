import { Test, TestingModule } from '@nestjs/testing';
import { ConfiguracionAlertaDesconexionService } from '../configuracion-alerta-desconexion.service';
import { CONFIGURACION_ALERTA_DESCONEXION_REPOSITORY } from '../repository/configuracion-alerta-desconexion.repository.interface';
import { ConfiguracionAlertaDesconexion } from '../entities/configuracion-alerta-desconexion.entity';

describe('ConfiguracionAlertaDesconexionService', () => {
  let service: ConfiguracionAlertaDesconexionService;
  let mockRepository: {
    findByEmpresa: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    mockRepository = {
      findByEmpresa: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfiguracionAlertaDesconexionService,
        {
          provide: CONFIGURACION_ALERTA_DESCONEXION_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ConfiguracionAlertaDesconexionService>(
      ConfiguracionAlertaDesconexionService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('obtenerOCrear', () => {
    it('cuando ya existe una configuración para la empresa, debe retornarla sin crear una nueva', async () => {
      const empresaId = 1;
      const configExistente = new ConfiguracionAlertaDesconexion();
      configExistente.id = 10;
      configExistente.empresaId = empresaId;
      configExistente.umbralMinutos = 20;

      mockRepository.findByEmpresa.mockResolvedValue(configExistente);

      const resultado = await service.obtenerOCrear(empresaId);

      expect(mockRepository.findByEmpresa).toHaveBeenCalledWith(empresaId);
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(resultado).toEqual(configExistente);
    });

    it('cuando no existe configuración para la empresa, debe crear una nueva con el umbral por defecto (15 min) y guardarla', async () => {
      const empresaId = 1;
      mockRepository.findByEmpresa.mockResolvedValue(null);
      mockRepository.save.mockImplementation((entity) =>
        Promise.resolve({ id: 1, ...entity }),
      );

      const resultado = await service.obtenerOCrear(empresaId);

      expect(mockRepository.findByEmpresa).toHaveBeenCalledWith(empresaId);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          empresaId: 1,
          umbralMinutos: 15,
        }),
      );
      expect(resultado.umbralMinutos).toBe(15);
    });
  });

  describe('actualizar', () => {
    it('cuando se actualiza el umbral, debe obtener la configuración existente y guardar el nuevo umbral', async () => {
      const empresaId = 1;
      const nuevoUmbral = 30;
      const configExistente = new ConfiguracionAlertaDesconexion();
      configExistente.id = 1;
      configExistente.empresaId = empresaId;
      configExistente.umbralMinutos = 15;

      mockRepository.findByEmpresa.mockResolvedValue(configExistente);
      mockRepository.save.mockImplementation((config) =>
        Promise.resolve(config),
      );

      const resultado = await service.actualizar(empresaId, nuevoUmbral);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          empresaId: 1,
          umbralMinutos: 30,
        }),
      );
      expect(resultado.umbralMinutos).toBe(30);
    });
  });
});
