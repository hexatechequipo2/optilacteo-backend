import { DictadoParametrosParserService } from '../parser/dictado-parametros-parser.service';
import { Parametro } from '../../config-parametro/enums/parametro.enum';

describe('DictadoParametrosParserService', () => {
  let parser: DictadoParametrosParserService;

  beforeEach(() => {
    parser = new DictadoParametrosParserService();
  });

  it('debe estar definido', () => {
    expect(parser).toBeDefined();
  });

  describe('caso base: transcripción real de Web Speech API (Chrome, es-AR)', () => {
    // Dictado: "grasa tres coma seis, proteína tres punto dos, acidez
    // catorce, temperatura cuatro". El reconocedor devolvió esto en DOS
    // eventos onresult separados:
    //   evento 1: "grasa 3,6"
    //   evento 2: " coma proteína 3,2, acidez 14 temperatura 4"
    // El parser recibe el texto YA acumulado (concatenación tal cual de los
    // finals, sin separador agregado) — así es como llega desde el llamador
    // que escucha onresult.
    const textoAcumulado =
      'grasa 3,6 coma proteína 3,2, acidez 14 temperatura 4';

    it('reconoce los 4 parámetros con sus valores, pese a los 3 separadores distintos', () => {
      const resultado = parser.parsear(textoAcumulado);

      expect(resultado.items).toHaveLength(4);
      expect(resultado.items).toEqual([
        expect.objectContaining({
          reconocido: true,
          parametro: Parametro.GRASA,
          valor: 3.6,
          confianza: 'alta',
          fueraDeRangoFisico: false,
          reglaAplicada: 'numero_formateado',
        }),
        expect.objectContaining({
          reconocido: true,
          parametro: Parametro.PROTEINA,
          valor: 3.2,
          confianza: 'alta',
          reglaAplicada: 'numero_formateado',
        }),
        expect.objectContaining({
          reconocido: true,
          parametro: Parametro.ACIDEZ,
          valor: 14,
          confianza: 'alta',
          reglaAplicada: 'numero_formateado',
        }),
        expect.objectContaining({
          reconocido: true,
          parametro: Parametro.TEMPERATURA,
          valor: 4,
          confianza: 'alta',
          reglaAplicada: 'numero_formateado',
        }),
      ]);
    });

    it('no genera ningún fragmento "no reconocido": la palabra "coma" suelta y las comas de puntuación son ruido descartado', () => {
      const resultado = parser.parsear(textoAcumulado);
      expect(resultado.items.every((item) => item.reconocido)).toBe(true);
    });

    it('conserva el texto original (con tildes) en cada ítem', () => {
      const resultado = parser.parsear(textoAcumulado);
      expect(resultado.items[1].textoOriginal).toBe('proteína 3,2');
    });
  });

  describe('separador de decimal: coma y punto son equivalentes', () => {
    it('interpreta tanto "6,7" como "1.03" como decimales válidos', () => {
      const resultado = parser.parsear('ph 6,7 densidad 1.03');

      expect(resultado.items).toEqual([
        expect.objectContaining({
          parametro: Parametro.PH,
          valor: 6.7,
          reglaAplicada: 'numero_formateado',
        }),
        expect.objectContaining({
          parametro: Parametro.DENSIDAD,
          valor: 1.03,
          reglaAplicada: 'numero_formateado',
        }),
      ]);
    });
  });

  describe('ruido entre ítems', () => {
    it('descarta un "punto" suelto entre el valor de un parámetro y el próximo parámetro', () => {
      const resultado = parser.parsear('temperatura 4 punto acidez 14');

      expect(resultado.items).toHaveLength(2);
      expect(resultado.items[0]).toEqual(
        expect.objectContaining({
          parametro: Parametro.TEMPERATURA,
          valor: 4,
          reconocido: true,
        }),
      );
      expect(resultado.items[1]).toEqual(
        expect.objectContaining({
          parametro: Parametro.ACIDEZ,
          valor: 14,
          reconocido: true,
        }),
      );
    });
  });

  describe('números dictados en palabras (el motor no los convirtió)', () => {
    it('parsea un número simple en palabras', () => {
      const resultado = parser.parsear('acidez catorce');

      expect(resultado.items).toEqual([
        expect.objectContaining({
          parametro: Parametro.ACIDEZ,
          valor: 14,
          confianza: 'media',
          reglaAplicada: 'numero_en_palabras',
        }),
      ]);
    });

    it('parsea una decena compuesta ("noventa y dos")', () => {
      // No "treinta y dos" (32): a partir de RANGO_PLAUSIBLE_DICTADO, 32 cae
      // fuera del rango plausible de CONDUCTIVIDAD (3-7) pero 3,2 sí entra,
      // así que dispararía la reinterpretación como decimal implícito (ver
      // describe "decimal implícito" más abajo) — no lo que este test quiere
      // ejercitar. 92 (y su mitad, 9,2) quedan fuera de ese rango en ambos
      // casos, así que aísla la gramática "decena y unidad" sin pisar el
      // otro caso.
      const resultado = parser.parsear('conductividad noventa y dos');

      expect(resultado.items[0]).toEqual(
        expect.objectContaining({
          parametro: Parametro.CONDUCTIVIDAD,
          valor: 92,
          reglaAplicada: 'numero_en_palabras',
        }),
      );
    });

    it('parsea un decimal dictado enteramente en palabras, donde "coma" SÍ es el separador decimal', () => {
      const resultado = parser.parsear('acidez catorce coma cinco');

      expect(resultado.items[0]).toEqual(
        expect.objectContaining({
          parametro: Parametro.ACIDEZ,
          valor: 14.5,
          confianza: 'media',
          reglaAplicada: 'numero_en_palabras',
        }),
      );
    });

    it('salta una "coma" suelta antes del número en palabras, igual que con dígitos', () => {
      const resultado = parser.parsear('grasa coma tres');

      expect(resultado.items[0]).toEqual(
        expect.objectContaining({
          parametro: Parametro.GRASA,
          valor: 3,
          reglaAplicada: 'numero_en_palabras',
        }),
      );
    });
  });

  describe('sinónimos del dominio', () => {
    it('reconoce "materia grasa" y "grasa butirosa" como GRASA sin capturar solo "grasa"', () => {
      const resultado = parser.parsear('materia grasa 3,6 grasa butirosa 4');

      expect(resultado.items).toEqual([
        expect.objectContaining({ parametro: Parametro.GRASA, valor: 3.6 }),
        expect.objectContaining({ parametro: Parametro.GRASA, valor: 4 }),
      ]);
    });

    it('reconoce "dornic" y "grados dornic" como ACIDEZ', () => {
      const resultado = parser.parsear('grados dornic 14 dornic 15');

      expect(resultado.items).toEqual([
        expect.objectContaining({ parametro: Parametro.ACIDEZ, valor: 14 }),
        expect.objectContaining({ parametro: Parametro.ACIDEZ, valor: 15 }),
      ]);
    });
  });

  describe('parámetro sin valor asociado', () => {
    it('reporta el parámetro con valor null cuando no hay número antes del próximo parámetro', () => {
      const resultado = parser.parsear('grasa proteina 3,2');

      expect(resultado.items).toEqual([
        expect.objectContaining({
          reconocido: true,
          parametro: Parametro.GRASA,
          valor: null,
          confianza: 'baja',
          reglaAplicada: 'sin_valor_asociado',
        }),
        expect.objectContaining({
          parametro: Parametro.PROTEINA,
          valor: 3.2,
        }),
      ]);
    });
  });

  describe('texto no reconocido', () => {
    it('reporta como fragmento no reconocido un parámetro fuera del vocabulario cerrado, sin descartarlo', () => {
      const resultado = parser.parsear('grados brix 12, grasa 3,6');

      expect(resultado.items).toHaveLength(2);
      expect(resultado.items[0]).toEqual(
        expect.objectContaining({
          reconocido: false,
          parametro: null,
          valor: null,
          reglaAplicada: 'texto_no_reconocido',
          textoOriginal: 'grados brix 12,',
        }),
      );
      expect(resultado.items[1]).toEqual(
        expect.objectContaining({
          reconocido: true,
          parametro: Parametro.GRASA,
          valor: 3.6,
        }),
      );
    });

    it('reporta todo el texto como no reconocido si no matchea ningún parámetro', () => {
      const resultado = parser.parsear('esto no tiene nada que ver');

      expect(resultado.items).toEqual([
        expect.objectContaining({
          reconocido: false,
          textoOriginal: 'esto no tiene nada que ver',
        }),
      ]);
    });
  });

  describe('rango físico (RANGOS_FISICOS)', () => {
    it('marca fueraDeRangoFisico sin bajar la confianza del parseo cuando el valor está bien formado', () => {
      // ph fuera de [0,14]: error de transcripción o de dictado, no algo que
      // el parser deba rechazar — se marca para revisión (AC5/6 del service).
      const resultado = parser.parsear('ph 47');

      expect(resultado.items[0]).toEqual(
        expect.objectContaining({
          parametro: Parametro.PH,
          valor: 47,
          confianza: 'alta',
          fueraDeRangoFisico: true,
        }),
      );
    });

    it('no marca fueraDeRangoFisico cuando el valor está dentro del rango físico', () => {
      const resultado = parser.parsear('ph 6,7');
      expect(resultado.items[0].fueraDeRangoFisico).toBe(false);
    });
  });

  // A partir de acá: ampliación de tolerancia a lenguaje natural. Ninguna de
  // estas frases es una transcripción real capturada de Web Speech API (a
  // diferencia del caso base más arriba, que sí lo es, con su origen
  // documentado) — son supuestos armados a partir de lo esperable para un
  // operario dictando, A VALIDAR dictando de verdad más adelante.
  describe('vocabulario ampliado (variantes de lenguaje natural, supuesto a validar dictando)', () => {
    it('reconoce sinónimos nuevos de GRASA: "tenor graso", "butirosa" sola, "m g", "eme ge"', () => {
      const resultado = parser.parsear(
        'tenor graso 3,6 butirosa 4 m g 5 eme ge 6',
      );

      expect(resultado.items).toHaveLength(4);
      expect(resultado.items.map((i) => i.parametro)).toEqual([
        Parametro.GRASA,
        Parametro.GRASA,
        Parametro.GRASA,
        Parametro.GRASA,
      ]);
      expect(resultado.items.map((i) => i.valor)).toEqual([3.6, 4, 5, 6]);
    });

    it('reconoce el plural "proteínas", no solo "proteína"', () => {
      const resultado = parser.parsear('proteínas 3,2');

      expect(resultado.items[0]).toEqual(
        expect.objectContaining({ parametro: Parametro.PROTEINA, valor: 3.2 }),
      );
    });

    it('reconoce "acidez en dornic" como ACIDEZ', () => {
      const resultado = parser.parsear('acidez en dornic 14');

      expect(resultado.items[0]).toEqual(
        expect.objectContaining({ parametro: Parametro.ACIDEZ, valor: 14 }),
      );
    });

    it('reconoce variantes de PH dictadas letra por letra: "pe hache", "p h", "pehache", y "acidez activa"', () => {
      const resultado = parser.parsear(
        'pe hache 6,7 p h 6,8 pehache 6,9 acidez activa 7',
      );

      expect(resultado.items).toHaveLength(4);
      expect(resultado.items.map((i) => i.parametro)).toEqual([
        Parametro.PH,
        Parametro.PH,
        Parametro.PH,
        Parametro.PH,
      ]);
      expect(resultado.items.map((i) => i.valor)).toEqual([6.7, 6.8, 6.9, 7]);
    });

    it('reconoce "temperatura de recepción", "densidad relativa" y "peso específico"', () => {
      const resultado = parser.parsear(
        'temperatura de recepcion 4 densidad relativa 1,03 peso especifico 1,04',
      );

      expect(resultado.items.map((i) => i.parametro)).toEqual([
        Parametro.TEMPERATURA,
        Parametro.DENSIDAD,
        Parametro.DENSIDAD,
      ]);
    });

    it('reconoce "conductividad eléctrica" y "conducti"', () => {
      const resultado = parser.parsear('conductividad electrica 5 conducti 6');

      expect(resultado.items.map((i) => i.valor)).toEqual([5, 6]);
    });

    it('NO suma "grados" como sinónimo suelto de ACIDEZ: "grados brix" sigue sin reconocerse', () => {
      // Ver el comentario junto a SINONIMOS_PARAMETRO en
      // dictado-parametros.constants.ts: quedó afuera a propósito pese a
      // estar en el pedido original, porque colisiona con "grados brix"
      // (otro parámetro fuera de vocabulario) y con "grados" como unidad
      // hablada de temperatura ("cuatro grados") — este mismo test ya
      // existía para el caso "grados brix" antes de este cambio.
      const resultado = parser.parsear('grados brix 12, grasa 3,6');

      expect(resultado.items[0]).toEqual(
        expect.objectContaining({
          reconocido: false,
          textoOriginal: 'grados brix 12,',
        }),
      );
    });
  });

  describe('relleno entre el parámetro y el valor (CAMBIO 2, supuesto a validar dictando)', () => {
    it('tolera relleno antes de un número en palabras: "grasa me dio tres coma seis"', () => {
      const resultado = parser.parsear('grasa me dio tres coma seis');

      expect(resultado.items).toEqual([
        expect.objectContaining({ parametro: Parametro.GRASA, valor: 3.6 }),
      ]);
    });

    it('tolera relleno antes de un número en dígitos: "grasa nos dio 3,6"', () => {
      const resultado = parser.parsear('grasa nos dio 3,6');

      expect(resultado.items).toEqual([
        expect.objectContaining({ parametro: Parametro.GRASA, valor: 3.6 }),
      ]);
    });

    it('tolera "en" como relleno antes del valor: "grasa en 3,6"', () => {
      const resultado = parser.parsear('grasa en 3,6');

      expect(resultado.items).toEqual([
        expect.objectContaining({ parametro: Parametro.GRASA, valor: 3.6 }),
      ]);
    });

    it('tolera "de" como relleno antes de un número en palabras: "acidez de catorce"', () => {
      const resultado = parser.parsear('acidez de catorce');

      expect(resultado.items).toEqual([
        expect.objectContaining({ parametro: Parametro.ACIDEZ, valor: 14 }),
      ]);
    });

    it('no reporta la unidad hablada después del valor como texto no reconocido: "temperatura está en cuatro grados"', () => {
      const resultado = parser.parsear('temperatura esta en cuatro grados');

      expect(resultado.items).toEqual([
        expect.objectContaining({ parametro: Parametro.TEMPERATURA, valor: 4 }),
      ]);
    });

    it('no reporta "por ciento" como texto no reconocido: "grasa tres coma seis por ciento"', () => {
      const resultado = parser.parsear('grasa tres coma seis por ciento');

      expect(resultado.items).toEqual([
        expect.objectContaining({ parametro: Parametro.GRASA, valor: 3.6 }),
      ]);
    });

    it('"acidez catorce dornic" es una sola lectura (ACIDEZ 14), no dos: "dornic" es la unidad, no una segunda mención', () => {
      const resultado = parser.parsear('acidez catorce dornic');

      expect(resultado.items).toHaveLength(1);
      expect(resultado.items[0]).toEqual(
        expect.objectContaining({
          parametro: Parametro.ACIDEZ,
          valor: 14,
          textoOriginal: 'acidez catorce dornic',
        }),
      );
    });
  });

  describe('parámetro nombrado después del valor (CAMBIO 3, supuesto a validar dictando)', () => {
    it('reconoce "<número> de <parámetro>": "tres coma seis de grasa"', () => {
      const resultado = parser.parsear('tres coma seis de grasa');

      expect(resultado.items).toEqual([
        expect.objectContaining({
          parametro: Parametro.GRASA,
          valor: 3.6,
          textoOriginal: 'tres coma seis de grasa',
        }),
      ]);
    });

    it('reconoce "<número> de <parámetro>" con el número en una sola palabra: "catorce de acidez"', () => {
      const resultado = parser.parsear('catorce de acidez');

      expect(resultado.items).toEqual([
        expect.objectContaining({ parametro: Parametro.ACIDEZ, valor: 14 }),
      ]);
    });

    it('reconoce "<número> <unidad> de <parámetro>", sin confundir la unidad con el valor: "cuatro grados de temperatura"', () => {
      const resultado = parser.parsear('cuatro grados de temperatura');

      expect(resultado.items).toEqual([
        expect.objectContaining({ parametro: Parametro.TEMPERATURA, valor: 4 }),
      ]);
    });

    it('no genera doble lectura cuando el patrón prefijo también podría aplicar a la misma ancla: "catorce de acidez 15"', () => {
      // Frase límite a propósito: "catorce de" resuelve ACIDEZ por el
      // patrón postfijo: el "15" que queda después de "acidez" no debe
      // generar una SEGUNDA lectura de ACIDEZ (si acaso, queda como texto
      // sin atribuir, no como valor duplicado).
      const resultado = parser.parsear('catorce de acidez 15');

      const itemsAcidez = resultado.items.filter(
        (i) => i.parametro === Parametro.ACIDEZ,
      );
      expect(itemsAcidez).toHaveLength(1);
      expect(itemsAcidez[0].valor).toBe(14);
    });
  });

  describe('decimal implícito (CAMBIO 4, supuesto a validar dictando)', () => {
    it('dos dígitos sueltos sin conector: "grasa tres seis" se interpreta como 3,6', () => {
      const resultado = parser.parsear('grasa tres seis');

      expect(resultado.items[0]).toEqual(
        expect.objectContaining({
          parametro: Parametro.GRASA,
          valor: 3.6,
          confianza: 'media',
          reglaAplicada: 'decimal_implicito',
        }),
      );
    });

    it('decena compuesta: "grasa treinta y seis" se interpreta como 3,6', () => {
      const resultado = parser.parsear('grasa treinta y seis');

      expect(resultado.items[0]).toEqual(
        expect.objectContaining({
          parametro: Parametro.GRASA,
          valor: 3.6,
          confianza: 'media',
          reglaAplicada: 'decimal_implicito',
        }),
      );
    });

    it('también dispara con un número ya formateado en dígitos, sin coma: "grasa 36"', () => {
      const resultado = parser.parsear('grasa 36');

      expect(resultado.items[0]).toEqual(
        expect.objectContaining({
          valor: 3.6,
          confianza: 'media',
          reglaAplicada: 'decimal_implicito',
        }),
      );
    });

    it('no se aplica si el entero ya cae dentro del rango plausible: "acidez catorce" se queda en 14', () => {
      const resultado = parser.parsear('acidez catorce');

      expect(resultado.items[0]).toEqual(
        expect.objectContaining({
          valor: 14,
          reglaAplicada: 'numero_en_palabras',
        }),
      );
    });

    it('no se aplica si ni el entero ni su mitad decimal caen en el rango plausible: "ph 47" se queda en 47', () => {
      const resultado = parser.parsear('ph 47');

      expect(resultado.items[0]).toEqual(
        expect.objectContaining({
          valor: 47,
          confianza: 'alta',
          reglaAplicada: 'numero_formateado',
        }),
      );
    });
  });
});
