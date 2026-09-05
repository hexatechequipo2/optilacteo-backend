import { Parametro } from '../../config-parametro/enums/parametro.enum';

export type ConfianzaParseoDictado = 'alta' | 'media' | 'baja';

export type ReglaParseoDictado =
  | 'numero_formateado' // el motor ya devolvió el número en dígitos (ej "3,6")
  | 'numero_en_palabras' // fallback: el número vino dictado en palabras
  | 'decimal_implicito' // entero fuera del rango plausible reinterpretado como decimal (ver RANGO_PLAUSIBLE_DICTADO)
  | 'sin_valor_asociado' // se reconoció el parámetro pero no un valor
  | 'texto_no_reconocido'; // tramo de texto que no matchea ningún parámetro

// Un ítem por cada parámetro anclado en el texto (con o sin valor) y uno por
// cada tramo que no matcheó ningún sinónimo conocido. Nunca se descarta texto
// en silencio: lo no reconocido se reporta con reconocido:false para que la
// pantalla de revisión se lo muestre al operario.
export interface ItemParseoDictado {
  reconocido: boolean;
  parametro: Parametro | null;
  valor: number | null;
  confianza: ConfianzaParseoDictado;
  // Plausibilidad física (RANGOS_FISICOS), NO el umbral por empresa/tipo de
  // materia prima. Esa comparación (ConfiguracionParametro) sigue siendo
  // responsabilidad de medicion-manual.service.ts, que sí tiene empresaId y
  // tipoMateriaPrima del lote — acá el parser no los usa ni los necesita.
  fueraDeRangoFisico: boolean;
  textoOriginal: string;
  reglaAplicada: ReglaParseoDictado;
}

export interface ResultadoParseoDictado {
  items: ItemParseoDictado[];
  textoOriginal: string;
}
