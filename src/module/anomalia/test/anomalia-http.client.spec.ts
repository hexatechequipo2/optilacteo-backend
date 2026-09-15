import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';

import { AnomaliaHttpClient } from '../clients/anomalia-http.client';
import { DetectarAnomaliaParams } from '../interfaces/anomalia-client.interface';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { TipoDesvioAnomalia } from '../../notificaciones/enums/tipo-desvio-anomalia.enum';

describe('AnomaliaHttpClient — comunicación HTTP con microservicio ML (HU-50)', () => {
  let client: AnomaliaHttpClient;
  let httpService: HttpService;

  const originalEnv = process.env;

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockParams: DetectarAnomaliaParams = {
    empresaId: 1,
    parametro: Parametro.PH,
    valor: 4.5,
    historicoReciente: [6.5, 6.4, 6.3],
  };

  beforeEach(async () => {
    process.env = { ...originalEnv, ML_SERVICE_URL: 'http://ml-service.local' };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnomaliaHttpClient,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    client = module.get<AnomaliaHttpClient>(AnomaliaHttpClient);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('cuando la consulta al microservicio responde exitosamente con anomalía, debe mapear correctamente los campos snake_case a camelCase', async () => {
    const mlResponsePayload = {
      status: 'ok',
      es_anomalia: true,
      parametro: Parametro.PH,
      tipo_desvio: TipoDesvioAnomalia.PICO,
      confianza: 96.8,
      modelo_version: 'v1.0.4',
    };

    const mockAxiosResponse: AxiosResponse = {
      data: mlResponsePayload,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    };

    mockHttpService.post.mockReturnValue(of(mockAxiosResponse));

    const resultado = await client.detectar(mockParams);

    expect(mockHttpService.post).toHaveBeenCalledWith(
      'http://ml-service.local/anomalias/detectar',
      {
        empresa_id: mockParams.empresaId,
        parametro: mockParams.parametro,
        valor: mockParams.valor,
        historico_reciente: mockParams.historicoReciente,
      },
    );

    expect(resultado).toEqual({
      status: 'ok',
      esAnomalia: true,
      parametro: Parametro.PH,
      tipoDesvio: TipoDesvioAnomalia.PICO,
      confianza: 96.8,
      modeloVersion: 'v1.0.4',
    });
  });

  it('cuando el microservicio responde con un status distinto de "ok", debe mapear la respuesta y registrar el log sin romper la ejecución', async () => {
    const mlResponsePayload = {
      status: 'error_modelo',
      es_anomalia: false,
      parametro: mockParams.parametro,
      tipo_desvio: null,
      confianza: 0,
      modelo_version: 'v1.0.4',
    };

    const mockAxiosResponse: AxiosResponse = {
      data: mlResponsePayload,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    };

    mockHttpService.post.mockReturnValue(of(mockAxiosResponse));

    const resultado = await client.detectar(mockParams);

    expect(resultado.status).toBe('error_modelo');
    expect(resultado.esAnomalia).toBe(false);
  });

  it('cuando falla la petición HTTP al microservicio, debe propagar el error hacia el llamador', async () => {
    const errorHttp = new Error('Network Connection Error');
    mockHttpService.post.mockReturnValue(throwError(() => errorHttp));

    await expect(client.detectar(mockParams)).rejects.toThrow('Network Connection Error');
  });
});