import { ANOMALIA_CLIENT } from '../interfaces/anomalia-client.interface';
import {
  DetectarAnomaliaParams,
  DetectarAnomaliaResultado,
  IAnomaliaClient,
} from '../interfaces/anomalia-client.interface';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

describe('AnomaliaClient interface', () => {
  it('debe exportar el token ANOMALIA_CLIENT correcto', () => {
    expect(ANOMALIA_CLIENT).toBe('ANOMALIA_CLIENT');
  });

  it('debe permitir construir parámetros válidos para detectar anomalías', () => {
    const params: DetectarAnomaliaParams = {
      empresaId: 1,
      parametro: Parametro.PH,
      valor: 7.2,
      historicoReciente: [6.8, 7.0, 7.1, 7.2],
    };

    expect(params.empresaId).toBe(1);
    expect(params.parametro).toBe(Parametro.PH);
    expect(params.valor).toBe(7.2);
    expect(params.historicoReciente).toEqual([6.8, 7.0, 7.1, 7.2]);
  });

  it('debe permitir resultados con status ok', () => {
    const resultado: DetectarAnomaliaResultado = {
      status: 'ok',
      esAnomalia: true,
      parametro: 'PH',
      tipoDesvio: 'alto',
      confianza: 0.95,
      modeloVersion: '1.0.0',
    };

    expect(resultado.status).toBe('ok');
    expect(resultado.esAnomalia).toBe(true);
    expect(resultado.confianza).toBe(0.95);
  });

  it('debe permitir resultados con datos insuficientes', () => {
    const resultado: DetectarAnomaliaResultado = {
      status: 'insufficient_data',
    };

    expect(resultado.status).toBe('insufficient_data');
  });

  it('debe permitir resultados con datos inválidos', () => {
    const resultado: DetectarAnomaliaResultado = {
      status: 'invalid_data',
    };

    expect(resultado.status).toBe('invalid_data');
  });

  it('debe permitir implementar IAnomaliaClient', async () => {
    const client: IAnomaliaClient = {
      detectar: jest.fn().mockResolvedValue({
        status: 'ok',
        esAnomalia: false,
      }),
    };

    const params: DetectarAnomaliaParams = {
      empresaId: 1,
      parametro: Parametro.PH,
      valor: 7.0,
      historicoReciente: [6.9, 7.0, 7.1],
    };

    await expect(client.detectar(params)).resolves.toEqual({
      status: 'ok',
      esAnomalia: false,
    });

    expect(client.detectar).toHaveBeenCalledWith(params);
  });
});