import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { of, throwError, defer } from 'rxjs';
import { AxiosResponse, AxiosHeaders } from 'axios';
import { PrediccionHttpClient } from '../clients/prediccion-http.client';
import { PredecirVolumenParams } from '../interfaces/prediccion-client.interface';

describe('PrediccionHttpClient', () => {
  let client: PrediccionHttpClient;
  let httpService: jest.Mocked<HttpService>;

  const originalEnv = process.env.ML_SERVICE_URL;

  beforeEach(async () => {
    process.env.ML_SERVICE_URL = 'http://localhost:8000';

    // Silenciar los logs de NestJS durante las pruebas
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const httpServiceMock = {
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrediccionHttpClient,
        {
          provide: HttpService,
          useValue: httpServiceMock,
        },
      ],
    }).compile();

    client = module.get<PrediccionHttpClient>(PrediccionHttpClient);
    httpService = module.get(HttpService);
  });

  afterEach(() => {
    process.env.ML_SERVICE_URL = originalEnv;
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const createAxiosResponse = (data: any): AxiosResponse => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

  it('debe estar definido', () => {
    expect(client).toBeDefined();
  });

  describe('predecir', () => {
    const mockParams: PredecirVolumenParams = {
      empresaId: 1,
      tipoMateriaPrima: 'LECHE_CRUDA' as any,
      serieHistorica: [{ fecha: '2026-09-15', valor: 100 }],
    };

    it('debe enviar la petición con el payload mapeado a snake_case y retornar status ok', async () => {
      const mockDias = [{ fecha: '2026-09-16', esperado: 120, minimo: 100, maximo: 140 }];
      const mockResponse = createAxiosResponse({
        status: 'ok',
        dias: mockDias,
        modelo_version: 'v1.0.0',
      });

      httpService.post.mockReturnValue(of(mockResponse));

      const result = await client.predecir(mockParams);

      expect(result).toEqual({
        status: 'ok',
        dias: mockDias,
        modeloVersion: 'v1.0.0',
      });
      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/volumen/predecir',
        {
          empresa_id: 1,
          tipo_materia_prima: 'LECHE_CRUDA',
          serie_historica: mockParams.serieHistorica,
        },
      );
    });

    it('debe loguear un mensaje cuando la respuesta no es status ok', async () => {
      const mockResponse = createAxiosResponse({
        status: 'insufficient_data',
        dias: [],
        modelo_version: 'n/a',
      });

      httpService.post.mockReturnValue(of(mockResponse));

      const result = await client.predecir(mockParams);

      expect(result).toEqual({
        status: 'insufficient_data',
        dias: [],
        modeloVersion: 'n/a',
      });
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Predicción de volumen insuficiente para empresa 1, materia prima LECHE_CRUDA.',
      );
    });

    it('debe propagar el error si falla la llamada HTTP', async () => {
      const error = new Error('Conexión rehusada');
      httpService.post.mockImplementation(() => defer(() => Promise.reject(error)));

      await expect(client.predecir(mockParams)).rejects.toThrow('Conexión rehusada');
    });
  });
});