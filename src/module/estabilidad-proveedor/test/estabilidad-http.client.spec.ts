import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { EstabilidadHttpClient } from '../clients/estabilidad-http.client';

describe('EstabilidadHttpClient', () => {
  let client: EstabilidadHttpClient;
  const originalEnv = process.env;
  const http = { post: jest.fn() };

  const params = {
    empresaId: 1,
    proveedorId: 2,
    series: [
      { parametro: 'PH', materiaPrima: 'LECHE', valores: [6.5, 6.6], umbralMin: 6, umbralMax: 7 },
    ],
  } as any;

  beforeEach(async () => {
    process.env = { ...originalEnv, ML_SERVICE_URL: 'http://ml.local' };
    http.post.mockReset();

    const module = await Test.createTestingModule({
      providers: [EstabilidadHttpClient, { provide: HttpService, useValue: http }],
    }).compile();
    client = module.get(EstabilidadHttpClient);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('envía el body en snake_case con timeout y mapea la respuesta a camelCase', async () => {
    http.post.mockReturnValue(
      of({
        data: {
          status: 'ok',
          clasificacion: 'estable',
          score: 0.9,
          modelo_version: 'v1',
          detalle: [
            {
              parametro: 'PH',
              materia_prima: 'LECHE',
              n: 10,
              media: 6.5,
              desvio: 0.1,
              desvio_normalizado: 0.05,
              clasificacion: 'estable',
            },
          ],
        },
      }),
    );

    const res = await client.clasificar(params);

    expect(http.post).toHaveBeenCalledWith(
      'http://ml.local/estabilidad-proveedor/clasificar',
      {
        empresa_id: 1,
        proveedor_id: 2,
        series: [
          { parametro: 'PH', materia_prima: 'LECHE', valores: [6.5, 6.6], umbral_min: 6, umbral_max: 7 },
        ],
      },
      { timeout: 10000 },
    );
    expect(res).toEqual({
      status: 'ok',
      clasificacion: 'estable',
      score: 0.9,
      modeloVersion: 'v1',
      detalle: [
        {
          parametro: 'PH',
          materiaPrima: 'LECHE',
          n: 10,
          media: 6.5,
          desvio: 0.1,
          desvioNormalizado: 0.05,
          clasificacion: 'estable',
        },
      ],
    });
  });

  it('deja detalle undefined si el microservicio no lo envía', async () => {
    http.post.mockReturnValue(of({ data: { status: 'insufficient_data' } }));

    const res = await client.clasificar(params);

    expect(res.status).toBe('insufficient_data');
    expect(res.detalle).toBeUndefined();
  });

  it('propaga el error HTTP', async () => {
    http.post.mockReturnValue(throwError(() => new Error('timeout')));

    await expect(client.clasificar(params)).rejects.toThrow('timeout');
  });
});