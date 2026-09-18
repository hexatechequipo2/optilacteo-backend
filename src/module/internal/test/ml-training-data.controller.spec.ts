import { Test, TestingModule } from '@nestjs/testing';
import { MlTrainingDataController } from '../ml-training-data.controller';
import { MlTrainingDataService } from '../ml-training-data.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';

describe('MlTrainingDataController — datos para entrenamiento ML (HU-49)', () => {
  let controller: MlTrainingDataController;
  let service: MlTrainingDataService;

  const mockMlTrainingDataService = {
    obtenerLotesParaEntrenamiento: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MlTrainingDataController],
      providers: [
        {
          provide: MlTrainingDataService,
          useValue: mockMlTrainingDataService,
        },
      ],
    })
      .overrideGuard(InternalApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MlTrainingDataController>(
      MlTrainingDataController,
    );
    service = module.get<MlTrainingDataService>(MlTrainingDataService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('obtenerLotes', () => {
    it('debe delegar la consulta al servicio con el empresaId parseado a number y retornar la lista de lotes', async () => {
      const empresaId = 1;
      const mockLotesResponse = [
        {
          id: 101,
          codigo: 'L-2026-001',
          destinoProductivo: 'Queso Cremoso',
          parametros: [],
        },
      ];

      mockMlTrainingDataService.obtenerLotesParaEntrenamiento.mockResolvedValue(
        mockLotesResponse,
      );

      const resultado = await controller.obtenerLotes(empresaId);

      expect(
        service.obtenerLotesParaEntrenamiento,
      ).toHaveBeenCalledWith(empresaId);
      expect(resultado).toEqual(mockLotesResponse);
    });

    it('cuando el servicio no encuentra lotes para la empresa, debe retornar una lista vacía', async () => {
      const empresaId = 99;
      mockMlTrainingDataService.obtenerLotesParaEntrenamiento.mockResolvedValue(
        [],
      );

      const resultado = await controller.obtenerLotes(empresaId);

      expect(
        service.obtenerLotesParaEntrenamiento,
      ).toHaveBeenCalledWith(empresaId);
      expect(resultado).toEqual([]);
    });
  });
});