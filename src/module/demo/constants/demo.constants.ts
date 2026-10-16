// Demo en vivo: los lotes que crea la demo llevan este prefijo en el código.
// Se usa también como guarda: los endpoints públicos solo operan sobre
// lotes con este prefijo, nunca sobre otros lotes de la empresa demo.
export const DEMO_PREFIJO_CODIGO_LOTE = 'DEMO-';

// Los sensores de la empresa demo se siembran como "Sensor N · libre"; al
// tomar un turno pasan a "Sensor N · {nombre del visitante}".
export const DEMO_PATRON_NOMBRE_SENSOR = /^Sensor (\d+) · (.+)$/;
export const DEMO_OCUPANTE_LIBRE = 'libre';

// Un turno sin actividad durante este tiempo se considera abandonado (el
// visitante cerró el navegador) y el sensor se puede volver a tomar.
export const DEMO_SEGUNDOS_VENCIMIENTO_TURNO = 60;

export const DEMO_NOMBRE_MAX_CARACTERES = 18;

// Datos fijos del lote que se crea por turno.
export const DEMO_CANTIDAD_LOTE = 1000;
// Respaldo si la empresa demo no tiene umbral de temperatura configurado
// para leche cruda (la leche cruda se recibe refrigerada).
export const DEMO_TEMPERATURA_INICIAL_DEFAULT = 4;

// GET /demo/tablero: vida del cache en memoria de la respuesta completa.
export const DEMO_TABLERO_CACHE_MS = 1_000;

// Rate limits (ttl en ms, @nestjs/throttler v6).
export const DEMO_THROTTLE_TURNO = { limit: 10, ttl: 60_000 };
export const DEMO_THROTTLE_LECTURAS = { limit: 10, ttl: 1_000 };
