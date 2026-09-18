import { ConfiguracionParametro } from '../../config-parametro/entities/config-parametro.entity';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { ResultadoParseoDictado } from '../parser/dictado-parametros.types';
import {
  FragmentoNoReconocidoResponseDto,
  ParametroDictadoResponseDto,
  ParsearDictadoResponseDto,
} from '../dto/parsear-dictado-response.dto';

export class AsistenteVozMapper {
  // Arma la respuesta del endpoint de previsualización a partir de lo que
  // devuelve el parser puro y de la config de obligatorios/umbrales de la
  // empresa para el tipo de materia prima del lote. No persiste nada — solo
  // arma el objeto, igual que MedicionManualMapper con las entidades.
  static aRespuesta(
    resultadoParseo: ResultadoParseoDictado,
    configsEmpresa: ConfiguracionParametro[],
  ): ParsearDictadoResponseDto {
    const mapaConfig = new Map(configsEmpresa.map((c) => [c.parametro, c]));
    const obligatorios = new Set(configsEmpresa.map((c) => c.parametro));

    const parametros: ParametroDictadoResponseDto[] = [];
    const noReconocido: FragmentoNoReconocidoResponseDto[] = [];
    const reconocidosConValor = new Set<Parametro>();

    for (const item of resultadoParseo.items) {
      if (item.reconocido && item.parametro !== null && item.valor !== null) {
        reconocidosConValor.add(item.parametro);
        parametros.push({
          parametro: item.parametro,
          valor: item.valor,
          confianza: item.confianza,
          fueraDeRangoFisico: item.fueraDeRangoFisico,
          fueraDeUmbralEmpresa: this.calcularFueraDeUmbralEmpresa(
            item.valor,
            mapaConfig.get(item.parametro),
          ),
          textoOriginal: item.textoOriginal,
        });
        continue;
      }

      // 'sin_valor_asociado' (parámetro nombrado sin valor detectable) o
      // 'texto_no_reconocido' (no matchea ningún parámetro): ninguno de los
      // dos es una medición utilizable, ambos van a revisión manual — nunca
      // se descartan en silencio.
      noReconocido.push({
        texto: item.textoOriginal,
        motivo: item.reglaAplicada as
          | 'sin_valor_asociado'
          | 'texto_no_reconocido',
      });
    }

    const obligatoriosFaltantes = [...obligatorios].filter(
      (parametro) => !reconocidosConValor.has(parametro),
    );

    return {
      parametros,
      noReconocido,
      obligatoriosFaltantes,
      textoOriginal: resultadoParseo.textoOriginal,
    };
  }

  private static calcularFueraDeUmbralEmpresa(
    valor: number,
    config: ConfiguracionParametro | undefined,
  ): boolean | null {
    // Sin config para esta empresa+parámetro+tipo de materia prima: no hay
    // umbral contra el cual comparar (mismo caso que EstadoMedicion.
    // SIN_UMBRAL_CONFIGURADO en medicion-manual). null, no false — false
    // insinuaría "está dentro del rango", cuando en realidad no se evaluó.
    if (!config) return null;
    return valor < config.umbralMin || valor > config.umbralMax;
  }
}
