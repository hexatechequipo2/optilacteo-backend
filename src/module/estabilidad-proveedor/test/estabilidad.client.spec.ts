import {
  ESTABILIDAD_CLIENT,
  IEstabilidadClient,
  ClasificarEstabilidadParams,
  ClasificarEstabilidadResultado,
} from '../interfaces/estabilidad-client.interface';
import { DetalleEstabilidad } from '../entities/proveedor-estabilidad.entity';

describe('IEstabilidadClient', () => {
  let client: jest.Mocked<IEstabilidadClient>;

  const params: ClasificarEstabilidadParams = {
    empresaId: 1,
    proveedorId: 10,
    series: [
      {
        parametro: 'pH',
        materiaPrima: 'Leche',
        valores: [6.5, 6.7, 6.6],
        umbralMin: 6,
        umbralMax: 7,
      },
    ],
  };

  const detalle: DetalleEstabilidad[] = [];

  beforeEach(() => {
    client = {
      clasificar: jest.fn(),
    };
  });

  describe('ESTABILIDAD_CLIENT', () => {
    it('debe tener el token de inyección correcto', () => {
      expect(ESTABILIDAD_CLIENT).toBe('ESTABILIDAD_CLIENT');
    });
  });

  describe('clasificar', () => {
    it('debe devolver una clasificación exitosa', async () => {
      const resultado: ClasificarEstabilidadResultado = {
        status: 'ok',
        clasificacion: 'estable',
        score: 95,
        detalle,
        modeloVersion: '1.0.0',
      };

      client.clasificar.mockResolvedValue(resultado);

      await expect(client.clasificar(params)).resolves.toEqual(resultado);

      expect(client.clasificar).toHaveBeenCalledWith(params);
      expect(client.clasificar).toHaveBeenCalledTimes(1);
    });

    it('debe devolver insufficient_data cuando los datos son insuficientes', async () => {
      const resultado: ClasificarEstabilidadResultado = {
        status: 'insufficient_data',
      };

      client.clasificar.mockResolvedValue(resultado);

      await expect(client.clasificar(params)).resolves.toEqual(resultado);
    });

    it('debe devolver invalid_data cuando los datos son inválidos', async () => {
      const resultado: ClasificarEstabilidadResultado = {
        status: 'invalid_data',
      };

      client.clasificar.mockResolvedValue(resultado);

      await expect(client.clasificar(params)).resolves.toEqual(resultado);
    });

    it('debe permitir una clasificación sin campos opcionales', async () => {
      const resultado: ClasificarEstabilidadResultado = {
        status: 'ok',
      };

      client.clasificar.mockResolvedValue(resultado);

      await expect(client.clasificar(params)).resolves.toEqual(resultado);
    });

    it('debe propagar los errores al clasificar', async () => {
      const error = new Error('Error al clasificar la estabilidad');

      client.clasificar.mockRejectedValue(error);

      await expect(client.clasificar(params)).rejects.toThrow(
        'Error al clasificar la estabilidad',
      );
    });

    it('debe aceptar series con umbrales nulos', async () => {
      const paramsSinUmbrales: ClasificarEstabilidadParams = {
        empresaId: 1,
        proveedorId: 10,
        series: [
          {
            parametro: 'Viscosidad',
            materiaPrima: 'Aceite',
            valores: [10, 12, 11],
            umbralMin: null,
            umbralMax: null,
          },
        ],
      };

      const resultado: ClasificarEstabilidadResultado = {
        status: 'ok',
        clasificacion: 'estable',
      };

      client.clasificar.mockResolvedValue(resultado);

      await expect(
        client.clasificar(paramsSinUmbrales),
      ).resolves.toEqual(resultado);

      expect(client.clasificar).toHaveBeenCalledWith(paramsSinUmbrales);
    });

    it('debe aceptar series vacías', async () => {
      const paramsSinSeries: ClasificarEstabilidadParams = {
        empresaId: 1,
        proveedorId: 10,
        series: [],
      };

      const resultado: ClasificarEstabilidadResultado = {
        status: 'insufficient_data',
      };

      client.clasificar.mockResolvedValue(resultado);

      await expect(
        client.clasificar(paramsSinSeries),
      ).resolves.toEqual(resultado);
    });
  });
});