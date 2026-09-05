import { Injectable } from '@nestjs/common';
import { Parametro } from '../../config-parametro/enums/parametro.enum';
import { RANGOS_FISICOS } from '../../config-parametro/validators/rangos-fisicos.constant';
import {
  CIEN_PALABRA,
  CONECTORES_DECIMALES,
  DECENAS_PALABRA,
  RANGO_PLAUSIBLE_DICTADO,
  SINONIMOS_PARAMETRO,
  UNIDADES_HABLADAS,
  UNIDADES_PALABRA,
} from './dictado-parametros.constants';
import {
  ItemParseoDictado,
  ReglaParseoDictado,
  ResultadoParseoDictado,
} from './dictado-parametros.types';

interface Ancla {
  parametro: Parametro;
  start: number;
  end: number;
}

interface TokenPalabra {
  text: string;
  start: number;
  end: number;
}

interface NumeroEncontrado {
  valor: number;
  fin: number; // índice relativo al segmento, justo después del número consumido
  regla: ReglaParseoDictado;
}

interface NumeroPostfijoEncontrado {
  valor: number;
  inicio: number; // índice ABSOLUTO en el texto normalizado donde arranca el número
  regla: ReglaParseoDictado;
}

// HU-55 (spike): parsea el texto YA transcripto por Web Speech API (este
// service no hace speech-to-text, ni sabe que existe un micrófono) a una
// lista de {parametro, valor} candidatos.
//
// Por qué ancla en los nombres de parámetro y no en puntuación: la prueba
// empírica con Web Speech API (es-AR) mostró que el separador entre ítems
// dictados es inconsistente — la MISMA frase produjo, para distintos ítems,
// una coma de puntuación, la palabra "coma" suelta, y directamente nada.
// Ver spikes/hu55-asistente-voz/dictado-test.html y el caso base en el spec.
// El vocabulario de parámetros, en cambio, es cerrado (7 palabras + sinónimos)
// y es la única señal estable en el texto: se busca cada aparición conocida
// y se toma el primer número que aparezca antes del próximo parámetro,
// ignorando lo que haya en el medio.
//
// Ampliación (tolerancia a lenguaje natural, HU-55 asistente-voz): un
// operario no dicta como una lista de {parámetro, valor}, habla. Sobre esa
// base se agregan tres capacidades:
// - Patrón "postfijo": el valor viene ANTES del parámetro ("tres coma seis
//   de grasa"), no solo después (ver buscarNumeroPostfijo).
// - Unidades habladas después del valor ("cuatro grados", "por ciento",
//   "dornic" como eco de "acidez ... catorce dornic") que no deben
//   confundirse con texto no reconocido ni con una segunda mención del
//   parámetro (ver esRuido y el chequeo de "eco de unidad" en parsear()).
// - Decimal implícito: un entero fuera del rango operativo plausible del
//   parámetro, que si se reinterpreta como decimal cae adentro, se toma como
//   tal — siempre marcado con confianza media y reglaAplicada explícita
//   ('decimal_implicito'), nunca en silencio (ver aplicarRangoPlausible).
@Injectable()
export class DictadoParametrosParserService {
  private readonly sinonimoAParametro = new Map<string, Parametro>();
  private readonly anchorPattern: RegExp;

  constructor() {
    const pares: { parametro: Parametro; sinonimo: string }[] = [];
    for (const [parametro, sinonimos] of Object.entries(
      SINONIMOS_PARAMETRO,
    ) as [Parametro, string[]][]) {
      for (const sinonimo of sinonimos) {
        pares.push({ parametro, sinonimo });
        this.sinonimoAParametro.set(sinonimo, parametro);
      }
    }
    // Sinónimos más largos primero: así "materia grasa" no queda capturado
    // como "grasa" suelta con "materia" colgando como texto no reconocido.
    pares.sort((a, b) => b.sinonimo.length - a.sinonimo.length);
    const alternativas = pares
      .map((p) => this.escaparRegex(p.sinonimo))
      .join('|');
    this.anchorPattern = new RegExp(`\\b(${alternativas})\\b`, 'g');
  }

  parsear(textoTranscripto: string): ResultadoParseoDictado {
    const original = textoTranscripto;
    const normalizado = this.normalizar(original);
    const anclas = this.buscarAnclas(normalizado);
    const items: ItemParseoDictado[] = [];

    if (anclas.length === 0) {
      this.agregarFragmentoNoReconocido(
        items,
        original,
        normalizado,
        0,
        normalizado.length,
      );
      return { items, textoOriginal: original };
    }

    // Cursor: hasta dónde de `normalizado` ya se procesó (reconocido o
    // descartado a propósito). Reemplaza el recorrido "de a pares de anclas"
    // original porque el patrón postfijo necesita mirar HACIA ATRÁS del
    // ancla actual, no solo hacia adelante.
    let cursor = 0;
    let i = 0;

    while (i < anclas.length) {
      const ancla = anclas[i];

      // 1) Patrón postfijo: "<numero> de|en <parametro>" (CAMBIO 3). Se
      //    intenta primero — si resuelve, el ancla queda consumida sin pasar
      //    por el patrón normal, para no arriesgar una doble lectura.
      const postfijo = this.buscarNumeroPostfijo(
        normalizado,
        cursor,
        ancla.start,
      );
      if (postfijo) {
        this.agregarFragmentoNoReconocido(
          items,
          original,
          normalizado,
          cursor,
          postfijo.inicio,
        );

        const numero = this.aplicarRangoPlausible(ancla.parametro, {
          valor: postfijo.valor,
          fin: 0,
          regla: postfijo.regla,
        });

        items.push({
          reconocido: true,
          parametro: ancla.parametro,
          valor: numero.valor,
          confianza: this.confianzaDe(numero.regla),
          fueraDeRangoFisico: this.esFueraDeRangoFisico(
            ancla.parametro,
            numero.valor,
          ),
          textoOriginal: original.slice(postfijo.inicio, ancla.end),
          reglaAplicada: numero.regla,
        });

        cursor = ancla.end;
        i++;
        continue;
      }

      // 2) Patrón normal (prefijo): "<parametro> ... <numero>". Lo que haya
      //    entre el cursor y este ancla, si no se resolvió como postfijo, es
      //    texto no reconocido de siempre.
      this.agregarFragmentoNoReconocido(
        items,
        original,
        normalizado,
        cursor,
        ancla.start,
      );

      const finBoundary =
        i + 1 < anclas.length ? anclas[i + 1].start : normalizado.length;
      const segmento = normalizado.slice(ancla.end, finBoundary);
      const numeroCrudo = this.buscarNumero(segmento);

      if (!numeroCrudo) {
        items.push({
          reconocido: true,
          parametro: ancla.parametro,
          valor: null,
          confianza: 'baja',
          fueraDeRangoFisico: false,
          textoOriginal: original.slice(ancla.start, ancla.end),
          reglaAplicada: 'sin_valor_asociado',
        });
        // El resto del segmento (sin número) se descarta sin reportar, igual
        // que siempre: comportamiento preexistente, no forma parte de este
        // cambio — ver el mismo criterio en la versión anterior del parser.
        cursor = finBoundary;
        i++;
        continue;
      }

      const numero = this.aplicarRangoPlausible(ancla.parametro, numeroCrudo);
      const finValorAbsoluto = ancla.end + numero.fin;

      // 3) Eco de unidad: el PRÓXIMO ancla es del mismo parámetro, pegada al
      //    valor recién encontrado sin nada más que ruido en el medio, y sin
      //    un número propio más adelante — es el caso "acidez ... catorce
      //    dornic": "dornic" no es una segunda mención, es la unidad hablada
      //    del valor que ya se encontró. Se absorbe en este ítem en vez de
      //    generar un ancla nueva (que quedaría sin valor, o peor, duplicada).
      let finConsumido = finValorAbsoluto;
      let siguiente = i + 1;
      if (
        siguiente < anclas.length &&
        anclas[siguiente].parametro === ancla.parametro &&
        this.esRuido(
          normalizado.slice(finValorAbsoluto, anclas[siguiente].start),
        ) &&
        !this.tieneNumeroPropio(normalizado, anclas, siguiente)
      ) {
        finConsumido = anclas[siguiente].end;
        siguiente++;
      }

      items.push({
        reconocido: true,
        parametro: ancla.parametro,
        valor: numero.valor,
        confianza: this.confianzaDe(numero.regla),
        fueraDeRangoFisico: this.esFueraDeRangoFisico(
          ancla.parametro,
          numero.valor,
        ),
        textoOriginal: original.slice(ancla.start, finConsumido),
        reglaAplicada: numero.regla,
      });

      cursor = finConsumido;
      i = siguiente;
    }

    // Tramo final después del último ancla procesado.
    this.agregarFragmentoNoReconocido(
      items,
      original,
      normalizado,
      cursor,
      normalizado.length,
    );

    return { items, textoOriginal: original };
  }

  // ¿El ancla en `indice` tiene su propio número en su propio segmento hacia
  // adelante? Distingue una segunda mención real ("grasa butirosa 4" después
  // de "materia grasa 3,6") de un eco de unidad sin valor propio ("dornic"
  // suelto al final, sin nada después).
  private tieneNumeroPropio(
    normalizado: string,
    anclas: Ancla[],
    indice: number,
  ): boolean {
    const ancla = anclas[indice];
    const finBoundary =
      indice + 1 < anclas.length
        ? anclas[indice + 1].start
        : normalizado.length;
    return (
      this.buscarNumero(normalizado.slice(ancla.end, finBoundary)) !== null
    );
  }

  private confianzaDe(regla: ReglaParseoDictado): 'alta' | 'media' {
    return regla === 'numero_formateado' ? 'alta' : 'media';
  }

  private buscarAnclas(normalizado: string): Ancla[] {
    const anclas: Ancla[] = [];
    this.anchorPattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = this.anchorPattern.exec(normalizado)) !== null) {
      const parametro = this.sinonimoAParametro.get(match[1]);
      if (parametro) {
        anclas.push({
          parametro,
          start: match.index,
          end: match.index + match[1].length,
        });
      }
    }
    return anclas;
  }

  private buscarNumero(segmento: string): NumeroEncontrado | null {
    // Caso normal (hallazgo del spike): el motor ya formatea el decimal,
    // con coma O con punto según cómo lo haya dictado el operario.
    const matchDigitos = /\d+(?:[.,]\d+)?/.exec(segmento);
    if (matchDigitos) {
      return {
        valor: parseFloat(matchDigitos[0].replace(',', '.')),
        fin: matchDigitos.index + matchDigitos[0].length,
        regla: 'numero_formateado',
      };
    }
    return this.buscarNumeroEnPalabras(segmento);
  }

  private buscarNumeroEnPalabras(segmento: string): NumeroEncontrado | null {
    const tokens: TokenPalabra[] = [...segmento.matchAll(/[a-z]+/g)].map(
      (m) => ({
        text: m[0],
        start: m.index ?? 0,
        end: (m.index ?? 0) + m[0].length,
      }),
    );

    // Se prueba desde cada token: los que no arrancan un número válido
    // (p.ej. una "coma" suelta antes del número) simplemente fallan y se
    // sigue con el próximo, sin necesidad de tratarlos como caso especial.
    for (let i = 0; i < tokens.length; i++) {
      const resultado = this.parsearNumeroDesde(tokens, i);
      if (resultado) {
        return { ...resultado, regla: 'numero_en_palabras' };
      }
    }
    return null;
  }

  // Patrón postfijo (CAMBIO 3): "<numero> de|en <ancla>", con el ancla
  // arrancando justo en `hasta`. Busca en [desde, hasta) un número (dígitos
  // o palabras) que termine, salvo ruido de unidad tolerado, justo antes de
  // un "de"/"en" pegado al ancla. Se prueba PRIMERO el patrón normal
  // (prefijo) en el llamador solo si esto no encuentra nada, así nunca se
  // generan dos lecturas para la misma ancla.
  private buscarNumeroPostfijo(
    normalizado: string,
    desde: number,
    hasta: number,
  ): NumeroPostfijoEncontrado | null {
    const region = normalizado.slice(desde, hasta);
    const matchConector = /\b(?:de|en)\b\s*$/.exec(region);
    if (!matchConector) return null;

    const antes = region.slice(0, matchConector.index);

    // Número en dígitos: el ÚLTIMO que aparece en el tramo (tolera ruido de
    // unidad antes del conector, ej "3,6 por ciento de grasa"), siempre que
    // lo que quede después sea puro ruido.
    const digitos = [...antes.matchAll(/\d+(?:[.,]\d+)?/g)];
    const ultimoDigito = digitos[digitos.length - 1];
    if (ultimoDigito && ultimoDigito.index !== undefined) {
      const finNumero = ultimoDigito.index + ultimoDigito[0].length;
      if (this.esRuido(antes.slice(finNumero))) {
        return {
          valor: parseFloat(ultimoDigito[0].replace(',', '.')),
          inicio: desde + ultimoDigito.index,
          regla: 'numero_formateado',
        };
      }
    }

    // Número en palabras, mismo criterio de ruido tolerado después.
    const tokens: TokenPalabra[] = [...antes.matchAll(/[a-z]+/g)].map((m) => ({
      text: m[0],
      start: m.index ?? 0,
      end: (m.index ?? 0) + m[0].length,
    }));

    for (let i = 0; i < tokens.length; i++) {
      const resultado = this.parsearNumeroDesde(tokens, i);
      if (!resultado) continue;
      if (this.esRuido(antes.slice(resultado.fin))) {
        return {
          valor: resultado.valor,
          inicio: desde + tokens[i].start,
          regla: 'numero_en_palabras',
        };
      }
    }

    return null;
  }

  private parsearNumeroDesde(
    tokens: TokenPalabra[],
    desde: number,
  ): { valor: number; fin: number } | null {
    const t0 = tokens[desde];
    if (!t0) return null;

    let entero: number;
    let consumidos: number;

    if (t0.text === CIEN_PALABRA) {
      entero = 100;
      consumidos = 1;
    } else if (t0.text in UNIDADES_PALABRA) {
      entero = UNIDADES_PALABRA[t0.text];
      consumidos = 1;

      // Dos dígitos sueltos dictados uno tras otro sin conector ("grasa tres
      // seis"): el operario dictando dígito por dígito. Solo cuando AMBOS
      // son dígitos simples (0-9) — "veinte" ya vale 20 por sí solo, no
      // tiene sentido concatenarlo con lo que sigue.
      const t1 = tokens[desde + 1];
      if (
        entero <= 9 &&
        t1 &&
        t1.text in UNIDADES_PALABRA &&
        UNIDADES_PALABRA[t1.text] <= 9
      ) {
        entero = entero * 10 + UNIDADES_PALABRA[t1.text];
        consumidos = 2;
      }
    } else if (t0.text in DECENAS_PALABRA) {
      entero = DECENAS_PALABRA[t0.text];
      consumidos = 1;
      const tY = tokens[desde + 1];
      const tUnidad = tokens[desde + 2];
      if (
        tY?.text === 'y' &&
        tUnidad &&
        tUnidad.text in UNIDADES_PALABRA &&
        UNIDADES_PALABRA[tUnidad.text] >= 1 &&
        UNIDADES_PALABRA[tUnidad.text] <= 9
      ) {
        entero += UNIDADES_PALABRA[tUnidad.text];
        consumidos = 3;
      }
    } else {
      return null;
    }

    let fin = tokens[desde + consumidos - 1].end;
    let valor = entero;

    // Parte decimal dictada en palabras: "catorce coma cinco". Acá "coma"/
    // "punto"/"con" sí son el separador decimal real, a diferencia del ruido
    // entre ítems que se descarta en agregarFragmentoNoReconocido.
    const tConector = tokens[desde + consumidos];
    const tDecimal = tokens[desde + consumidos + 1];
    if (
      tConector &&
      CONECTORES_DECIMALES.has(tConector.text) &&
      tDecimal &&
      tDecimal.text in UNIDADES_PALABRA
    ) {
      valor = Number(`${entero}.${UNIDADES_PALABRA[tDecimal.text]}`);
      fin = tDecimal.end;
    }

    return { valor, fin };
  }

  // Decimal implícito (CAMBIO 4): un entero fuera del rango operativo
  // plausible del parámetro (RANGO_PLAUSIBLE_DICTADO, más angosto que
  // RANGOS_FISICOS) que, reinterpretado como decimal (dividido por 10), cae
  // adentro. Nunca se aplica en silencio: siempre marca confianza 'media' y
  // reglaAplicada 'decimal_implicito', sin importar de dónde vino el número
  // (dígitos o palabras) — la sospecha es la misma en cualquier caso.
  private aplicarRangoPlausible(
    parametro: Parametro,
    numero: NumeroEncontrado,
  ): NumeroEncontrado {
    if (!Number.isInteger(numero.valor)) return numero;

    const rango = RANGO_PLAUSIBLE_DICTADO[parametro];
    if (numero.valor >= rango.min && numero.valor <= rango.max) {
      return numero;
    }

    const comoDecimal = numero.valor / 10;
    if (comoDecimal >= rango.min && comoDecimal <= rango.max) {
      return { ...numero, valor: comoDecimal, regla: 'decimal_implicito' };
    }

    return numero;
  }

  private esFueraDeRangoFisico(parametro: Parametro, valor: number): boolean {
    const rango = RANGOS_FISICOS[parametro];
    return valor < rango.min || valor > rango.max;
  }

  private agregarFragmentoNoReconocido(
    items: ItemParseoDictado[],
    original: string,
    normalizado: string,
    start: number,
    end: number,
  ): void {
    if (end <= start) return;

    const fragmentoNormalizado = normalizado.slice(start, end);
    if (this.esRuido(fragmentoNormalizado)) return;

    items.push({
      reconocido: false,
      parametro: null,
      valor: null,
      confianza: 'baja',
      fueraDeRangoFisico: false,
      textoOriginal: original.slice(start, end).trim(),
      reglaAplicada: 'texto_no_reconocido',
    });
  }

  // Ruido descartable entre un valor y el próximo ancla (o el final del
  // texto): conectores decimales sueltos ("coma", "punto") Y unidades
  // habladas después de un valor ("grados", "por ciento"). Ninguna palabra
  // de UNIDADES_HABLADAS es también un sinónimo de parámetro (ver el
  // comentario de SINONIMOS_PARAMETRO), así que no hay ambigüedad.
  private esRuido(fragmento: string): boolean {
    return fragmento
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .every(
        (palabra) =>
          CONECTORES_DECIMALES.has(palabra) || UNIDADES_HABLADAS.has(palabra),
      );
  }

  // Fold de acentos preservando longitud (á→a, ñ→n, etc.) para que los
  // índices de match en el texto normalizado sigan apuntando a la posición
  // correcta en el texto original — así textoOriginal conserva tildes/mayúsculas.
  private normalizar(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private escaparRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
