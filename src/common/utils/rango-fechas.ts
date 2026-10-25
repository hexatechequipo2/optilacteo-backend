// HU-75: única fuente de verdad para convertir días calendario de la empresa
// (Argentina) a instantes UTC. Argentina no aplica horario de verano desde
// 2009, así que el offset es fijo y no hace falta una librería de zonas.
export const ZONA_HORARIA_EMPRESA = 'America/Argentina/Cordoba';
const OFFSET_EMPRESA = '-03:00';

const FORMATO_FECHA_CALENDARIO = /^\d{4}-\d{2}-\d{2}$/;

export interface RangoUtc {
  desde: Date; // inclusivo
  hastaExclusivo: Date;
}

// Valida formato YYYY-MM-DD y que el día exista (rechaza 2026-02-30).
export function esFechaCalendarioValida(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !FORMATO_FECHA_CALENDARIO.test(valor)) {
    return false;
  }
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

// Representa el día calendario como medianoche UTC, para hacer aritmética
// de días/semanas/meses sin depender de la TZ del proceso.
export function fechaCalendarioComoUtc(fecha: string): Date {
  if (!esFechaCalendarioValida(fecha)) {
    throw new Error(`Fecha calendario inválida: ${String(fecha)}`);
  }
  return new Date(`${fecha}T00:00:00.000Z`);
}

export function sumarDias(fecha: string, dias: number): string {
  const d = fechaCalendarioComoUtc(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// 00:00 hora de la empresa del día indicado, como instante UTC.
export function inicioDelDiaEmpresa(fecha: string): Date {
  fechaCalendarioComoUtc(fecha); // valida
  return new Date(`${fecha}T00:00:00.000${OFFSET_EMPRESA}`);
}

// [desde 00:00 AR, (hasta + 1 día) 00:00 AR): ambos días quedan incluidos.
// Usar siempre con `>= desde AND < hastaExclusivo`, nunca con BETWEEN.
export function rangoDiasInclusivoEmpresa(
  desde: string,
  hasta: string,
): RangoUtc {
  return {
    desde: inicioDelDiaEmpresa(desde),
    hastaExclusivo: inicioDelDiaEmpresa(sumarDias(hasta, 1)),
  };
}
