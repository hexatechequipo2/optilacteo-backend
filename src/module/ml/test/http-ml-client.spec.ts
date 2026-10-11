import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { HttpMlClient } from '../infrastructure/http-ml-client';

describe('HttpMlClient', () => {
  const http = { post: jest.fn() };
  const originalUrl = process.env.ML_SERVICE_URL;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  const crear = async (url?: string) => {
    if (url === undefined) delete process.env.ML_SERVICE_URL;
    else process.env.ML_SERVICE_URL = url;

    const module = await Test.createTestingModule({
      providers: [HttpMlClient, { provide: HttpService, useValue: http }],
    }).compile();
    return module.get(HttpMlClient);
  };

  beforeEach(() => {
    http.post.mockReset();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.ML_SERVICE_URL;
    else process.env.ML_SERVICE_URL = originalUrl;
    jest.restoreAllMocks();
  });

  describe('predecirDestino', () => {
    const features = { empresaId: 1, parametros: [{ parametro: 'PH', valor: 6.5 }] };

    it('mapea la respuesta ok', async () => {
      const client = await crear('http://ml.local');
      http.post.mockReturnValue(
        of({ data: { status: 'ok', destino_recomendado: 'QUESO', confianza: 0.9 } }),
      );

      const res = await client.predecirDestino(features);

      expect(http.post).toHaveBeenCalledWith('http://ml.local/recommendations/destino', {
        empresa_id: 1,
        parametros: features.parametros,
      });
      expect(res).toEqual({ status: 'ok', destinoRecomendado: 'QUESO', confianza: 0.9 });
    });

    it('usa localhost:8000 si no hay ML_SERVICE_URL', async () => {
      const client = await crear(undefined);
      http.post.mockReturnValue(of({ data: { status: 'insufficient_data' } }));

      const res = await client.predecirDestino(features);

      expect(http.post.mock.calls[0][0]).toBe('http://localhost:8000/recommendations/destino');
      expect(res).toEqual({ status: 'insufficient_data' });
    });

    it('ante un error devuelve insufficient_data', async () => {
      const client = await crear('http://ml.local');
      http.post.mockReturnValue(throwError(() => new Error('boom')));

      await expect(client.predecirDestino(features)).resolves.toEqual({
        status: 'insufficient_data',
      });
    });
  });

  describe('detectarAnomalia', () => {
    it('mapea la respuesta ok', async () => {
      const client = await crear('http://ml.local');
      http.post.mockReturnValue(
        of({ data: { status: 'ok', es_anomalia: true, confianza: 0.8 } }),
      );

      const res = await client.detectarAnomalia(1, 'PH', 4.2);

      expect(http.post).toHaveBeenCalledWith('http://ml.local/anomalias/detectar', {
        empresa_id: 1,
        parametro: 'PH',
        valor: 4.2,
      });
      expect(res).toEqual({ status: 'ok', esAnomalia: true, confianza: 0.8 });
    });

    it.each(['insufficient_data', 'invalid_data'])('devuelve solo el status "%s"', async (status) => {
      const client = await crear('http://ml.local');
      http.post.mockReturnValue(of({ data: { status } }));

      await expect(client.detectarAnomalia(1, 'PH', 1)).resolves.toEqual({ status });
    });

    it('ante un error devuelve insufficient_data', async () => {
      const client = await crear('http://ml.local');
      http.post.mockReturnValue(throwError(() => new Error('boom')));

      await expect(client.detectarAnomalia(1, 'PH', 1)).resolves.toEqual({
        status: 'insufficient_data',
      });
    });
  });

  describe('manejo de errores', () => {
    it.each(['ECONNREFUSED', 'ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH'])(
      'loguea warn (no error) para el código %s',
      async (code) => {
        const client = await crear('http://ml.local');
        http.post.mockReturnValue(
          throwError(() => Object.assign(new Error('sin conexión'), { code })),
        );

        await client.detectarAnomalia(1, 'PH', 1);

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(code));
        expect(errorSpy).not.toHaveBeenCalled();
      },
    );

    it('loguea error para fallas inesperadas', async () => {
      const client = await crear('http://ml.local');
      http.post.mockReturnValue(throwError(() => new Error('500 interno')));

      await client.detectarAnomalia(1, 'PH', 1);

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('500 interno'));
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('serializa errores que no son instancia de Error y tolera code no string', async () => {
      const client = await crear('http://ml.local');
      http.post.mockReturnValue(throwError(() => ({ code: 500, detalle: 'x' })));

      await client.detectarAnomalia(1, 'PH', 1);

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('"detalle":"x"'));
    });

    it('tolera un error null', async () => {
      const client = await crear('http://ml.local');
      http.post.mockReturnValue(throwError(() => null));

      await expect(client.detectarAnomalia(1, 'PH', 1)).resolves.toEqual({
        status: 'insufficient_data',
      });
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});