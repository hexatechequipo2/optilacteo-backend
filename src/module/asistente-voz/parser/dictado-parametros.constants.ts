import { Parametro } from '../../config-parametro/enums/parametro.enum';

// HU-55 (spike): vocabulario cerrado de sinónimos por parámetro. Es el ancla
// de la que depende toda la segmentación — ver dictado-parametros-parser.service.ts
// para el porqué (Web Speech API no da un separador de ítems confiable).
// Van sin tildes y en minúscula: el parser normaliza el texto (fold de
// acentos) antes de buscar, así que tienen que coincidir con esa forma —
// por eso NO hace falta cargar la variante con tilde de cada palabra
// ("proteína" además de "proteina"): el fold ya hace que ambas matcheen la
// misma entrada. Sí hace falta cargar el PLURAL o cualquier forma que no sea
// un simple fold de acentos ("proteinas", "grasa butirosa" vs "butirosa"
// sueltas), porque \b...\b exige un límite de palabra exacto.
//
// OJO con "grados" como sinónimo suelto de ACIDEZ (grados Dornic): NO se
// agregó. Es demasiado ambiguo — colisiona con "grados brix" (otro parámetro,
// fuera de vocabulario, tiene que seguir reportándose como no reconocido) y
// con "grados" como unidad hablada después de un valor de OTRO parámetro
// ("la temperatura está en cuatro grados", ver UNIDADES_HABLADAS más abajo).
// Van los sinónimos compuestos que si lo acotan ("grados dornic", "acidez en
// dornic").
export const SINONIMOS_PARAMETRO: Record<Parametro, string[]> = {
  [Parametro.GRASA]: [
    'grasa butirometrica',
    'grasa butirosa',
    'materia grasa',
    'tenor graso',
    'eme ge',
    'butirosa',
    'grasa',
    'm g',
  ],
  [Parametro.PROTEINA]: [
    'proteina bruta',
    'proteina total',
    'proteinas',
    'proteina',
  ],
  [Parametro.ACIDEZ]: [
    'acidez en dornic',
    'acidez titulable',
    'grados dornic',
    'acidez dornic',
    'acidez',
    'dornic',
  ],
  [Parametro.PH]: ['pe hache', 'acidez activa', 'pehache', 'p h', 'ph'],
  [Parametro.TEMPERATURA]: [
    'temperatura de recepcion',
    'temperatura de ingreso',
    'temperatura',
    'temp',
  ],
  [Parametro.DENSIDAD]: ['densidad relativa', 'peso especifico', 'densidad'],
  [Parametro.CONDUCTIVIDAD]: [
    'conductividad electrica',
    'conductividad',
    'conducti',
  ],
};

// Palabras sueltas que el motor deja como texto literal en vez de formatear
// un número directamente (hallazgo del spike: la misma frase dio "3,6" en un
// punto y " coma " suelto en otro). Se ignoran cuando aparecen como ruido
// entre un valor ya resuelto y el próximo parámetro; DENTRO de una secuencia
// de números en palabras ("catorce coma cinco") cumplen el rol real de
// separador decimal — ver parsearNumeroDesde en el service.
export const CONECTORES_DECIMALES = new Set(['coma', 'punto', 'con']);

// Unidades habladas después de un valor ("cuatro grados", "tres coma seis
// por ciento"): igual que los conectores decimales, se ignoran cuando
// aparecen como ruido entre un valor ya resuelto y el próximo parámetro (o
// el final del texto). Ninguna de estas palabras es por sí sola un sinónimo
// de parámetro (ver el comentario de SINONIMOS_PARAMETRO sobre "grados"),
// así que no hay ambigüedad con el vocabulario de anclas.
export const UNIDADES_HABLADAS = new Set([
  'grados',
  'por',
  'ciento',
  'porciento',
]);

// Números en palabras: fallback para cuando el motor NO convirtió el número
// dictado a dígitos (pasa de forma inconsistente, no en todos los casos).
// Cubre 0-100, el rango realista para los 7 parámetros del dominio.
export const UNIDADES_PALABRA: Record<string, number> = {
  cero: 0,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuno: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
};

export const DECENAS_PALABRA: Record<string, number> = {
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
};

export const CIEN_PALABRA = 'cien';

// Rango PLAUSIBLE operativo por parámetro — distinto de RANGOS_FISICOS
// (config-parametro/validators), que es la cota físicamente posible y ya se
// usa para fueraDeRangoFisico. Este rango es más angosto y específico del
// dictado por voz: sirve solo para decidir cuándo un entero "suena" a un
// decimal mal dictado (ver decimal implícito en dictado-parametros-parser.service.ts),
// nunca para marcar fueraDeRangoFisico ni fueraDeUmbralEmpresa.
export const RANGO_PLAUSIBLE_DICTADO: Record<
  Parametro,
  { min: number; max: number }
> = {
  [Parametro.PH]: { min: 6.0, max: 7.0 },
  [Parametro.TEMPERATURA]: { min: 0, max: 15 },
  [Parametro.DENSIDAD]: { min: 1.02, max: 1.04 },
  [Parametro.GRASA]: { min: 2, max: 6 },
  [Parametro.PROTEINA]: { min: 2.5, max: 4.5 },
  [Parametro.ACIDEZ]: { min: 12, max: 20 },
  [Parametro.CONDUCTIVIDAD]: { min: 3, max: 7 },
};
