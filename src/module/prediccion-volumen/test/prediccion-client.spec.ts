import {
  PREDICCION_CLIENT,
  PredecirVolumenParams,
  DiaPrediccionResultado,
  PredecirVolumenResultado,
  IPrediccionClient,
} from '../interfaces/prediccion-client.interface';
import { TipoMateriaPrima } from '../../config-parametro/enums/tipo-materia-prima-enum';

describe('PrediccionClient', () => {
  describe('PREDICCION_CLIENT', () => {
    it('debería tener el nombre correcto del token de inyección', () => {
      expect(PREDICCION_CLIENT).toBe('PREDICCION_CLIENT');
    });
  });

  describe('interfaces', () => {
    it('debería permitir construir parámetros de predicción válidos', () => {
      const params: PredecirVolumenParams = {
        empresaId: 1,
        tipoMateriaPrima: Object.values(TipoMateriaPrima)[0] as TipoMateriaPrima,
        serieHistorica: [
          { fecha: '2026-01-01', valor: 100 },
          { fecha: '2026-01-02', valor: 120 },
        ],
      };

      expect(params.empresaId).toBe(1);
      expect(params.tipoMateriaPrima).toBeDefined();
      expect(params.serieHistorica).toHaveLength(2);
    });

    it('debería permitir construir un día de predicción', () => {
      const dia: DiaPrediccionResultado = {
        fecha: '2026-01-03',
        minimo: 90,
        esperado: 110,
        maximo: 130,
      };

      expect(dia).toEqual({
        fecha: '2026-01-03',
        minimo: 90,
        esperado: 110,
        maximo: 130,
      });
    });

    it('debería permitir un resultado exitoso con días y versión del modelo', () => {
      const resultado: PredecirVolumenResultado = {
        status: 'ok',
        dias: [
          {
            fecha: '2026-01-03',
            minimo: 90,
            esperado: 110,
            maximo: 130,
          },
        ],
        modeloVersion: '1.0.0',
      };

      expect(resultado.status).toBe('ok');
      expect(resultado.dias).toHaveLength(1);
      expect(resultado.modeloVersion).toBe('1.0.0');
    });

    it('debería permitir un resultado con datos insuficientes', () => {
      const resultado: PredecirVolumenResultado = {
        status: 'insufficient_data',
      };

      expect(resultado.status).toBe('insufficient_data');
      expect(resultado.dias).toBeUndefined();
      expect(resultado.modeloVersion).toBeUndefined();
    });

    it('debería permitir implementar IPrediccionClient', async () => {
      const mockClient: IPrediccionClient = {
        predecir: jest.fn().mockResolvedValue({
          status: 'ok',
          dias: [],
          modeloVersion: '1.0.0',
        }),
      };

      const params: PredecirVolumenParams = {
        empresaId: 1,
        tipoMateriaPrima: Object.values(TipoMateriaPrima)[0] as TipoMateriaPrima,
        serieHistorica: [],
      };

      const resultado = await mockClient.predecir(params);

      expect(mockClient.predecir).toHaveBeenCalledWith(params);
      expect(resultado.status).toBe('ok');
    });
  });
});
