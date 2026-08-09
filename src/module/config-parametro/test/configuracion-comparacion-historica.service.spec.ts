import { Test, TestingModule } from '@nestjs/testing';
import {
  ConfiguracionComparacionHistoricaService,
  DESVIO_SIGNIFICATIVO_DEFAULT,
  CANTIDAD_REGISTROS_HISTORICOS_DEFAULT,
} from '../configuracion-comparacion-historica.service';
import { CONFIGURACION_COMPARACION_HISTORICA_REPOSITORY } from '../repository/configuracion-comparacion-historica.repository.interface';

const mockRepository = {
  findByEmpresa: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

describe('ConfiguracionComparacionHistoricaService', () => {
  let service: ConfiguracionComparacionHistoricaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfiguracionComparacionHistoricaService,
        {
          provide: CONFIGURACION_COMPARACION_HISTORICA_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ConfiguracionComparacionHistoricaService>(
      ConfiguracionComparacionHistoricaService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('getConfig', () => {
    it('cuando la empresa nunca configuró nada (HU-23, criterio 4), debe devolver los valores por defecto', async () => {
      mockRepository.findByEmpresa.mockResolvedValue(null);

      const resultado = await service.getConfig(1);

      expect(resultado).toEqual({
        desvioSignificativoPorcentaje: DESVIO_SIGNIFICATIVO_DEFAULT,
        cantidadRegistrosHistoricos: CANTIDAD_REGISTROS_HISTORICOS_DEFAULT,
      });
    });

    it('cuando la empresa tiene configuración guardada, debe devolver esos valores numéricos', async () => {
      mockRepository.findByEmpresa.mockResolvedValue({
        desvioSignificativoPorcentaje: '25.00',
        cantidadRegistrosHistoricos: 30,
      });

      const resultado = await service.getConfig(1);

      expect(resultado).toEqual({
        desvioSignificativoPorcentaje: 25,
        cantidadRegistrosHistoricos: 30,
      });
    });
  });

  describe('update', () => {
    it('cuando la empresa nunca tuvo configuración y envía ambos campos, debe crearla con esos valores', async () => {
      mockRepository.findByEmpresa.mockResolvedValue(null);
      mockRepository.create.mockImplementation((c: object) => c);
      mockRepository.save.mockImplementation((c: object) => c);

      const resultado = await service.update(1, {
        desvioSignificativoPorcentaje: 20,
        cantidadRegistrosHistoricos: 15,
      });

      expect(mockRepository.create).toHaveBeenCalledWith({
        empresaId: 1,
        desvioSignificativoPorcentaje: 20,
        cantidadRegistrosHistoricos: 15,
      });
      expect(resultado).toEqual({
        desvioSignificativoPorcentaje: 20,
        cantidadRegistrosHistoricos: 15,
      });
    });

    it('cuando la empresa nunca tuvo configuración y no envía campos, debe crearla con los valores por defecto', async () => {
      mockRepository.findByEmpresa.mockResolvedValue(null);
      mockRepository.create.mockImplementation((c: object) => c);
      mockRepository.save.mockImplementation((c: object) => c);

      const resultado = await service.update(1, {});

      expect(mockRepository.create).toHaveBeenCalledWith({
        empresaId: 1,
        desvioSignificativoPorcentaje: DESVIO_SIGNIFICATIVO_DEFAULT,
        cantidadRegistrosHistoricos: CANTIDAD_REGISTROS_HISTORICOS_DEFAULT,
      });
      expect(resultado.desvioSignificativoPorcentaje).toBe(
        DESVIO_SIGNIFICATIVO_DEFAULT,
      );
    });

    it('cuando ya existe configuración y solo envía un campo, debe actualizar ese campo y conservar el otro', async () => {
      const configExistente = {
        empresaId: 1,
        desvioSignificativoPorcentaje: 15,
        cantidadRegistrosHistoricos: 20,
      };
      mockRepository.findByEmpresa.mockResolvedValue(configExistente);
      mockRepository.save.mockImplementation((c: object) => c);

      const resultado = await service.update(1, {
        desvioSignificativoPorcentaje: 40,
      });

      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(resultado).toEqual({
        desvioSignificativoPorcentaje: 40,
        cantidadRegistrosHistoricos: 20,
      });
    });

    it('cuando ya existe configuración y no envía campos, debe conservar los valores anteriores', async () => {
      const configExistente = {
        empresaId: 1,
        desvioSignificativoPorcentaje: 15,
        cantidadRegistrosHistoricos: 20,
      };
      mockRepository.findByEmpresa.mockResolvedValue(configExistente);
      mockRepository.save.mockImplementation((c: object) => c);

      const resultado = await service.update(1, {});

      expect(resultado).toEqual({
        desvioSignificativoPorcentaje: 15,
        cantidadRegistrosHistoricos: 20,
      });
    });
  });
});
