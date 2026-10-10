
import { AsistenteVozMapper } from '../mappers/asistente-voz.mapper';
import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { ResultadoParseoDictado } from '../parser/dictado-parametros.types';

describe('AsistenteVozMapper', () => {
  const crearConfig = (
    parametro: Parametro,
    umbralMin: number,
    umbralMax: number,
  ): ConfiguracionParametro =>
    ({
      parametro,
      umbralMin,
      umbralMax,
    }) as ConfiguracionParametro;

  const crearResultado = (
    items: any[],
    textoOriginal = 'pH 7.2 y temperatura 25',
  ): ResultadoParseoDictado =>
    ({
      textoOriginal,
      items,
    }) as ResultadoParseoDictado;

  describe('aRespuesta', () => {
    it('debe mapear parámetros reconocidos y evaluar sus umbrales', () => {
      const resultadoParseo = crearResultado([
        {
          reconocido: true,
          parametro: Parametro.PH,
          valor: 7.2,
          confianza: 0.98,
          fueraDeRangoFisico: false,
          textoOriginal: 'pH 7.2',
          reglaAplicada: 'parametro_con_valor',
        },
      ]);

      const configs = [
        crearConfig(Parametro.PH, 6.5, 8.5),
      ];

      const resultado = AsistenteVozMapper.aRespuesta(
        resultadoParseo,
        configs,
      );

      expect(resultado.parametros).toHaveLength(1);
      expect(resultado.parametros[0]).toEqual({
        parametro: Parametro.PH,
        valor: 7.2,
        confianza: 0.98,
        fueraDeRangoFisico: false,
        fueraDeUmbralEmpresa: false,
        textoOriginal: 'pH 7.2',
      });
      expect(resultado.noReconocido).toEqual([]);
      expect(resultado.obligatoriosFaltantes).toEqual([]);
      expect(resultado.textoOriginal).toBe('pH 7.2 y temperatura 25');
    });

    it('debe marcar como fuera de umbral si el valor es menor al mínimo', () => {
      const resultadoParseo = crearResultado([
        {
          reconocido: true,
          parametro: Parametro.PH,
          valor: 5,
          confianza: 0.9,
          fueraDeRangoFisico: true,
          textoOriginal: 'pH 5',
          reglaAplicada: 'parametro_con_valor',
        },
      ]);

      const resultado = AsistenteVozMapper.aRespuesta(
        resultadoParseo,
        [crearConfig(Parametro.PH, 6, 9)],
      );

      expect(resultado.parametros[0].fueraDeUmbralEmpresa).toBe(true);
    });

    it('debe marcar como fuera de umbral si el valor supera el máximo', () => {
      const resultadoParseo = crearResultado([
        {
          reconocido: true,
          parametro: Parametro.PH,
          valor: 10,
          confianza: 0.9,
          fueraDeRangoFisico: true,
          textoOriginal: 'pH 10',
          reglaAplicada: 'parametro_con_valor',
        },
      ]);

      const resultado = AsistenteVozMapper.aRespuesta(
        resultadoParseo,
        [crearConfig(Parametro.PH, 6, 9)],
      );

      expect(resultado.parametros[0].fueraDeUmbralEmpresa).toBe(true);
    });

    it('debe considerar dentro del umbral los valores iguales al mínimo y máximo', () => {
      const resultadoParseo = crearResultado([
        {
          reconocido: true,
          parametro: Parametro.PH,
          valor: 6,
          confianza: 0.9,
          fueraDeRangoFisico: false,
          textoOriginal: 'pH 6',
          reglaAplicada: 'parametro_con_valor',
        },
        {
          reconocido: true,
          parametro: Parametro.PH,
          valor: 9,
          confianza: 0.9,
          fueraDeRangoFisico: false,
          textoOriginal: 'pH 9',
          reglaAplicada: 'parametro_con_valor',
        },
      ]);

      const resultado = AsistenteVozMapper.aRespuesta(
        resultadoParseo,
        [crearConfig(Parametro.PH, 6, 9)],
      );

      expect(
        resultado.parametros.map((p) => p.fueraDeUmbralEmpresa),
      ).toEqual([false, false]);
    });

    it('debe devolver null cuando no existe configuración para el parámetro', () => {
      const resultadoParseo = crearResultado([
        {
          reconocido: true,
          parametro: Parametro.PH,
          valor: 7.2,
          confianza: 0.95,
          fueraDeRangoFisico: false,
          textoOriginal: 'pH 7.2',
          reglaAplicada: 'parametro_con_valor',
        },
      ]);

      const resultado = AsistenteVozMapper.aRespuesta(
        resultadoParseo,
        [],
      );

      expect(resultado.parametros[0].fueraDeUmbralEmpresa).toBeNull();
    });

    it('debe enviar a revisión los parámetros reconocidos sin valor', () => {
      const resultadoParseo = crearResultado([
        {
          reconocido: true,
          parametro: Parametro.PH,
          valor: null,
          confianza: 0.8,
          fueraDeRangoFisico: false,
          textoOriginal: 'pH',
          reglaAplicada: 'sin_valor_asociado',
        },
      ]);

      const resultado = AsistenteVozMapper.aRespuesta(
        resultadoParseo,
        [crearConfig(Parametro.PH, 6, 9)],
      );

      expect(resultado.parametros).toEqual([]);
      expect(resultado.noReconocido).toEqual([
        {
          texto: 'pH',
          motivo: 'sin_valor_asociado',
        },
      ]);
      expect(resultado.obligatoriosFaltantes).toContain(Parametro.PH);
    });

    it('debe enviar a revisión los fragmentos de texto no reconocidos', () => {
      const resultadoParseo = crearResultado([
        {
          reconocido: false,
          parametro: null,
          valor: null,
          confianza: 0.1,
          fueraDeRangoFisico: false,
          textoOriginal: 'color muy raro',
          reglaAplicada: 'texto_no_reconocido',
        },
      ]);

      const resultado = AsistenteVozMapper.aRespuesta(
        resultadoParseo,
        [],
      );

      expect(resultado.noReconocido).toEqual([
        {
          texto: 'color muy raro',
          motivo: 'texto_no_reconocido',
        },
      ]);
      expect(resultado.parametros).toEqual([]);
    });

    it('debe incluir todos los parámetros obligatorios que no fueron reconocidos con valor', () => {
      const resultadoParseo = crearResultado([
        {
          reconocido: true,
          parametro: Parametro.PH,
          valor: 7,
          confianza: 0.9,
          fueraDeRangoFisico: false,
          textoOriginal: 'pH 7',
          reglaAplicada: 'parametro_con_valor',
        },
      ]);

      const configs = [
        crearConfig(Parametro.PH, 6, 9),
        crearConfig(Parametro.TEMPERATURA, 10, 30),
      ];

      const resultado = AsistenteVozMapper.aRespuesta(
        resultadoParseo,
        configs,
      );

      expect(resultado.obligatoriosFaltantes).toEqual([
        Parametro.TEMPERATURA,
      ]);
    });

    it('debe devolver listas vacías si no hay elementos ni configuraciones', () => {
      const resultadoParseo = crearResultado([], '');

      const resultado = AsistenteVozMapper.aRespuesta(
        resultadoParseo,
        [],
      );

      expect(resultado).toEqual({
        parametros: [],
        noReconocido: [],
        obligatoriosFaltantes: [],
        textoOriginal: '',
      });
    });

    it('debe preservar el texto original del dictado', () => {
      const textoOriginal = 'El pH es siete punto dos';

      const resultado = AsistenteVozMapper.aRespuesta(
        crearResultado([], textoOriginal),
        [],
      );

      expect(resultado.textoOriginal).toBe(textoOriginal);
    });
  });
});
