import { Test, TestingModule } from '@nestjs/testing';
import { SemaforoService } from '../semaforo.service';
import { EstadoMedicion } from '../../lectura-sensor/enums/estado-medicion.enum';

describe('SemaforoService', () => {
  let service: SemaforoService;

  const configMock = {
    umbralMin: 10,
    umbralMax: 20,
    umbralAlertaMin: 5,
    umbralAlertaMax: 25,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SemaforoService],
    }).compile();

    service = module.get<SemaforoService>(SemaforoService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('calcularEstado', () => {
    it('debe retornar SIN_UMBRAL_CONFIGURADO si la configuración es undefined', () => {
      const resultado = service.calcularEstado(15, undefined);
      expect(resultado).toBe(EstadoMedicion.SIN_UMBRAL_CONFIGURADO);
    });

    it('debe retornar NORMAL (verde) cuando el valor está dentro del rango seguro [umbralMin, umbralMax]', () => {
      // umbralMin = 10, umbralMax = 20
      const resultadoExactoMin = service.calcularEstado(10, configMock);
      const resultadoMedio = service.calcularEstado(15, configMock);
      const resultadoExactoMax = service.calcularEstado(20, configMock);

      expect(resultadoExactoMin).toBe(EstadoMedicion.NORMAL);
      expect(resultadoMedio).toBe(EstadoMedicion.NORMAL);
      expect(resultadoExactoMax).toBe(EstadoMedicion.NORMAL);
    });

    it('debe retornar EN_LIMITE (amarillo) cuando el valor está fuera de [umbralMin, umbralMax] pero dentro de [umbralAlertaMin, umbralAlertaMax]', () => {
      // umbralAlertaMin = 5, umbralMin = 10, umbralMax = 20, umbralAlertaMax = 25
      const resultadoLimiteInferior = service.calcularEstado(7, configMock);
      const resultadoLimiteSuperior = service.calcularEstado(22, configMock);

      expect(resultadoLimiteInferior).toBe(EstadoMedicion.EN_LIMITE);
      expect(resultadoLimiteSuperior).toBe(EstadoMedicion.EN_LIMITE);
    });

    it('debe retornar FUERA_DE_RANGO (rojo) cuando el valor está estrictamente por debajo de umbralAlertaMin o por encima de umbralAlertaMax', () => {
      // umbralAlertaMin = 5, umbralAlertaMax = 25
      const resultadoMuyBajo = service.calcularEstado(4, configMock);
      const resultadoMuyAlto = service.calcularEstado(26, configMock);

      expect(resultadoMuyBajo).toBe(EstadoMedicion.FUERA_DE_RANGO);
      expect(resultadoMuyAlto).toBe(EstadoMedicion.FUERA_DE_RANGO);
    });

    it('debe convertir correctamente a Number valores de umbrales provenientes como strings (e.g. desde PostgreSQL / Numeric)', () => {
      const configStrings = {
        umbralMin: '10' as any,
        umbralMax: '20' as any,
        umbralAlertaMin: '5' as any,
        umbralAlertaMax: '25' as any,
      };

      const resultadoVerde = service.calcularEstado(15, configStrings);
      const resultadoAmarillo = service.calcularEstado(8, configStrings);
      const resultadoRojo = service.calcularEstado(30, configStrings);

      expect(resultadoVerde).toBe(EstadoMedicion.NORMAL);
      expect(resultadoAmarillo).toBe(EstadoMedicion.EN_LIMITE);
      expect(resultadoRojo).toBe(EstadoMedicion.FUERA_DE_RANGO);
    });
  });
});