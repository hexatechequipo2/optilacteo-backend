/**
 * Datos de prueba SOLO PARA LOCAL — para poder ver el gráfico de "Evolución
 * de indicadores" (HU-39, frontend) moverse en los tres períodos (día,
 * semana, mes) contra el endpoint real GET /dashboard/indicadores/evolucion.
 *
 * No es parte de ninguna feature ni se commitea: vive en scripts/ (mismo
 * lugar que scripts/demo-aprendizaje-supervisado.sql, ya sin trackear en
 * git) y no se toca src/seeds/seed.ts.
 *
 * Inserta SOLO en mediciones_manuales_lote (MedicionManualLote) — la
 * empresa objetivo solo tiene sensores de "temperatura" (ver sensores en la
 * DB), y crear sensores de hardware inventado para los otros 6 parámetros
 * se pasa de "datos de prueba" a "modificar catálogo". MedicionManualLote
 * ya trae el parámetro directo en la fila (no depende de ningún sensor), así
 * que cubre los 7 parámetros sin tocar la tabla sensores para nada.
 *
 * Resuelve la empresa por nombre (ILIKE 'estancia%') en vez de hardcodear un
 * id — se confirmó contra la DB (2026-09-13) que hay un único match:
 * id=1, name='Estancia Don Benito'. Si en tu DB hay más de un resultado o
 * ninguno, el script corta con un error en vez de adivinar.
 *
 * Reutiliza lotes y un usuario YA EXISTENTES en esa empresa (no crea lotes
 * ni usuarios) — el loteId de una medición no tiene que coincidir con la
 * fecha real del lote (no hay FK ni constraint que lo exija), así que se
 * hace round-robin sobre los lotes existentes aunque sean más nuevos que
 * las mediciones de hace 12 meses.
 *
 * Volumen: por cada uno de los 7 parámetros —
 *   - últimos 30 días: 2 mediciones/día (variedad día a día)
 *   - día 31 a día ~365: 1 medición cada 3 días (cobertura para granularidad
 *     "semana" y "mes")
 * ≈ 1200 filas en total. Los valores son center+amplitud*seno(fase por
 * parámetro)+ruido — no son realistas al dedillo, pero varían visiblemente
 * punto a punto.
 *
 * OJO: no es idempotente. Correrlo dos veces duplica las filas. Para
 * limpiar: DELETE FROM mediciones_manuales_lote WHERE id >= <primer id
 * insertado> (el script imprime el rango de ids al final).
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-evolucion-indicadores-test-data.ts
 */
import 'dotenv/config';
import { ILike } from 'typeorm';
import dataSource from '../src/data-source';
import { Empresa } from '../src/module/empresa/entities/empresa.entity';
import { Lote } from '../src/module/lote/entities/lote.entity';
import { User } from '../src/module/user/entities/user.entity';
import { MedicionManualLote } from '../src/module/medicion-manual/entities/medicion-manual-lote.entity';
import { Parametro } from '../src/module/config-parametro/enums/parametro.enum';
import { TipoMateriaPrima } from '../src/module/config-parametro/enums/tipo-materia-prima-enum';

const DIAS_DENSOS = 30; // últimos 30 días: dense, variedad día a día
const DIAS_TOTAL = 365; // cobertura hasta ~12 meses atrás
const PASO_SPARSE_DIAS = 3; // 1 medición cada 3 días más allá de los 30 días
const LECTURAS_POR_DIA_DENSO = 2;

// Centro/amplitud por parámetro — valores plausibles de leche cruda, no
// físicamente extremos (los RANGOS_FISICOS de config-parametro son límites
// de validación, no un centro realista). El objetivo es "se mueve
// visiblemente", no precisión de laboratorio.
const RANGOS: Record<Parametro, { centro: number; amplitud: number }> = {
  [Parametro.PH]: { centro: 6.6, amplitud: 0.3 },
  [Parametro.TEMPERATURA]: { centro: 5, amplitud: 3 },
  [Parametro.DENSIDAD]: { centro: 1.031, amplitud: 0.003 },
  [Parametro.GRASA]: { centro: 3.6, amplitud: 0.5 },
  [Parametro.PROTEINA]: { centro: 3.3, amplitud: 0.3 },
  [Parametro.ACIDEZ]: { centro: 16, amplitud: 2 },
  [Parametro.CONDUCTIVIDAD]: { centro: 5, amplitud: 2 },
};

function hashSemilla(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) {
    h = (h << 5) - h + texto.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Fase propia por parámetro (a partir de su hash) para que las 7 curvas no
// queden todas sincronizadas entre sí.
function fase(parametro: Parametro): number {
  return (hashSemilla(parametro) % 628) / 100;
}

function generarValor(parametro: Parametro, diasAtras: number): number {
  const { centro, amplitud } = RANGOS[parametro];
  const ondaMensual = Math.sin((diasAtras / 30) * Math.PI + fase(parametro)) * amplitud * 0.5;
  const ondaSemanal = Math.sin((diasAtras / 3.5) * Math.PI + fase(parametro)) * amplitud * 0.2;
  const ruido = (Math.random() - 0.5) * amplitud * 0.3;
  const valor = centro + ondaMensual + ondaSemanal + ruido;
  return Math.round(valor * 100) / 100;
}

function fechaHaceNDias(dias: number, horaBase: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  // Hora dentro del día laboral (6-20hs) con algo de jitter, para no apilar
  // todo a medianoche.
  const hora = Math.min(20, Math.max(6, horaBase + Math.floor(Math.random() * 3) - 1));
  d.setHours(hora, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

async function seed() {
  await dataSource.initialize();

  const empresaRepo = dataSource.getRepository(Empresa);
  const loteRepo = dataSource.getRepository(Lote);
  const userRepo = dataSource.getRepository(User);
  const medicionRepo = dataSource.getRepository(MedicionManualLote);

  // No se hardcodea el id: se resuelve por nombre y se corta si no hay
  // exactamente un match, en vez de asumir cuál empresa es.
  const empresas = await empresaRepo.find({ where: { name: ILike('estancia%') } });
  if (empresas.length !== 1) {
    throw new Error(
      `Se esperaba exactamente 1 empresa con nombre "estancia%", se encontraron ${empresas.length}. ` +
        `Ajustá el filtro del script en vez de asumir cuál es.`,
    );
  }
  const empresa = empresas[0];
  console.log(`Empresa objetivo: id=${empresa.id} name="${empresa.name}"`);

  const lotes = await loteRepo.find({
    where: { empresaId: empresa.id },
    order: { id: 'ASC' },
    take: 20,
  });
  if (lotes.length === 0) {
    throw new Error(`La empresa ${empresa.id} no tiene lotes — hacen falta para la FK loteId.`);
  }
  console.log(`Lotes existentes a reusar (round-robin): ${lotes.length}`);

  // Preferencia por un usuario de "Responsable de calidad" (rol que en la
  // app carga mediciones manuales) — si no hay, cualquier usuario de la
  // empresa sirve para la FK.
  // User no tiene una columna empresaId mapeada como propiedad (a
  // diferencia de Lote) — solo la relación empresa, sin @JoinColumn
  // explícito — así que el filtro va por la relación, no por un campo
  // plano.
  const usuarios = await userRepo.find({
    where: { empresa: { id: empresa.id } },
    relations: { rol: true },
  });
  if (usuarios.length === 0) {
    throw new Error(`La empresa ${empresa.id} no tiene usuarios — hacen falta para la FK usuarioId.`);
  }
  const usuario =
    usuarios.find((u) => u.rol?.nombre === 'Responsable de calidad') ?? usuarios[0];
  console.log(`Usuario a reusar: id=${usuario.id} (${usuario.email})`);

  const parametros = Object.values(Parametro);
  const filas: Partial<MedicionManualLote>[] = [];
  let loteIndex = 0;

  for (const parametro of parametros) {
    // Últimos 30 días: denso, variedad día a día.
    for (let dia = 0; dia < DIAS_DENSOS; dia++) {
      for (let n = 0; n < LECTURAS_POR_DIA_DENSO; n++) {
        filas.push({
          loteId: lotes[loteIndex % lotes.length].id,
          tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
          parametro,
          valor: generarValor(parametro, dia),
          empresaId: empresa.id,
          usuarioId: usuario.id,
          createdAt: fechaHaceNDias(dia, n === 0 ? 9 : 16),
        });
        loteIndex++;
      }
    }
    // Día 31 a ~365: más espaciado, para cubrir semana/mes sin explotar el
    // volumen de filas.
    for (let dia = DIAS_DENSOS + 1; dia <= DIAS_TOTAL; dia += PASO_SPARSE_DIAS) {
      filas.push({
        loteId: lotes[loteIndex % lotes.length].id,
        tipoMateriaPrima: TipoMateriaPrima.LECHE_CRUDA,
        parametro,
        valor: generarValor(parametro, dia),
        empresaId: empresa.id,
        usuarioId: usuario.id,
        createdAt: fechaHaceNDias(dia, 12),
      });
      loteIndex++;
    }
  }

  console.log(`Filas a insertar: ${filas.length}`);

  const TAMANIO_LOTE_INSERT = 300;
  let primerId: number | null = null;
  let ultimoId: number | null = null;
  for (let i = 0; i < filas.length; i += TAMANIO_LOTE_INSERT) {
    const chunk = filas.slice(i, i + TAMANIO_LOTE_INSERT);
    const resultado = await medicionRepo.insert(chunk);
    const ids = resultado.identifiers.map((r) => r.id as number);
    if (primerId === null) primerId = Math.min(...ids);
    ultimoId = Math.max(ultimoId ?? 0, ...ids);
    console.log(`  insertadas ${i + chunk.length}/${filas.length}...`);
  }

  console.log(`Listo. Rango de ids insertados: ${primerId}–${ultimoId}`);
  console.log(
    `Para limpiar: DELETE FROM mediciones_manuales_lote WHERE id BETWEEN ${primerId} AND ${ultimoId};`,
  );

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
