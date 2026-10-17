/**
 * Datos de prueba SOLO PARA LOCAL — para poder ver la "Predicción de volumen
 * semanal" (HU-51) con status="ok" en vez de "insufficient_data".
 *
 * No es parte de ninguna feature ni se commitea (mismo criterio que
 * scripts/seed-evolucion-indicadores-test-data.ts).
 *
 * Qué exige la predicción para salir "ok":
 *   - Backend (prediccion-volumen.service.ts): >= 21 días DISTINTOS con lotes
 *     de esa empresa + materia prima, con `cantidad` no nula, en los últimos
 *     180 días.
 *   - ML (ml-service/app/routers/volumen.py): >= 30 muestras
 *     (min_training_samples) y al menos una muestra por cada día de la
 *     semana. Por eso el default acá es 60 días, no 21.
 *
 * Inserta lotes en `lotes` (2-3 por día, volumen con estacionalidad semanal
 * + ruido) reusando un tambo activo de la empresa y su proveedor. No crea
 * empresas, proveedores ni tambos.
 *
 * Idempotente por código: los lotes llevan codigo 'SEED-PRED-...' y si ya
 * existe uno con el mismo código se saltea. Para limpiar:
 *   DELETE FROM lotes WHERE codigo LIKE 'SEED-PRED-%';
 *
 * Con --generar, además levanta el contexto de Nest y corre
 * PrediccionVolumenService.generarYPersistir() para esa empresa+materia
 * prima (lo mismo que hace el cron de las 3 AM), así no hay que esperar al
 * cron. Requiere el ml-service corriendo en ML_SERVICE_URL.
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-prediccion-volumen-test-data.ts \
 *     --empresa=1 [--materia=leche_cruda|crema_de_leche|masa_hilada] [--dias=60] [--generar]
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Like } from 'typeorm';
import { AppModule } from '../src/app.module';
import dataSource from '../src/data-source';
import { Empresa } from '../src/module/empresa/entities/empresa.entity';
import { Lote } from '../src/module/lote/entities/lote.entity';
import { Tambo } from '../src/module/tambo/entities/tambo.entity';
import { TipoMateriaPrima } from '../src/module/config-parametro/enums/tipo-materia-prima-enum';
import { UnidadCantidad } from '../src/module/lote/enums/unidad-cantidad.enum';
import { EstadoLote } from '../src/module/lote/enums/estado-lote.enum';
import { PrediccionVolumenService } from '../src/module/prediccion-volumen/prediccion-volumen.service';

const PREFIJO_CODIGO = 'SEED-PRED';

// Volumen diario total aproximado por materia prima, repartido entre los
// lotes del día. Plausible, no de precisión.
const VOLUMEN_DIARIO: Record<TipoMateriaPrima, { centro: number; unidad: UnidadCantidad }> = {
  [TipoMateriaPrima.LECHE_CRUDA]: { centro: 10000, unidad: UnidadCantidad.LITROS },
  [TipoMateriaPrima.CREMA_DE_LECHE]: { centro: 600, unidad: UnidadCantidad.LITROS },
  [TipoMateriaPrima.MASA_HILADA]: { centro: 350, unidad: UnidadCantidad.KILOGRAMOS },
};

// Factor por día de la semana (0=domingo) para que el modelo tenga un
// patrón semanal visible.
const FACTOR_DIA_SEMANA = [0.7, 1.05, 1.1, 1.0, 1.05, 1.1, 0.85];

function leerArg(nombre: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(`--${nombre}=`));
  return arg?.split('=')[1];
}

function formatearFecha(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

async function seed() {
  const empresaId = Number(leerArg('empresa'));
  if (!Number.isInteger(empresaId) || empresaId <= 0) {
    throw new Error('Falta --empresa=<id> (id numérico de la empresa del usuario con el que entrás al front).');
  }

  const materia = (leerArg('materia') ?? TipoMateriaPrima.LECHE_CRUDA) as TipoMateriaPrima;
  if (!Object.values(TipoMateriaPrima).includes(materia)) {
    throw new Error(`--materia inválida: "${materia}". Opciones: ${Object.values(TipoMateriaPrima).join(', ')}`);
  }

  const dias = Number(leerArg('dias') ?? 60);
  if (!Number.isInteger(dias) || dias < 30 || dias > 179) {
    throw new Error('--dias debe ser un entero entre 30 (mínimo del ML) y 179 (ventana de 180 del backend).');
  }

  const generar = process.argv.includes('--generar');

  await dataSource.initialize();

  const empresa = await dataSource.getRepository(Empresa).findOne({ where: { id: empresaId } });
  if (!empresa) {
    throw new Error(`No existe la empresa id=${empresaId}.`);
  }
  console.log(`Empresa objetivo: id=${empresa.id} name="${empresa.name}"`);

  // Tambo activo de la empresa — de ahí sale también el proveedorId, así
  // el par tambo/proveedor queda consistente.
  const tambo = await dataSource.getRepository(Tambo).findOne({
    where: { empresaId, activo: true },
    order: { id: 'ASC' },
  });
  if (!tambo) {
    throw new Error(`La empresa ${empresaId} no tiene tambos activos — hace falta uno para la FK tamboId.`);
  }
  console.log(`Tambo a reusar: id=${tambo.id} "${tambo.nombre}" (proveedorId=${tambo.proveedorId})`);

  const loteRepo = dataSource.getRepository(Lote);
  const existentes = new Set(
    (
      await loteRepo.find({
        select: { codigo: true },
        where: { codigo: Like(`${PREFIJO_CODIGO}-%`) },
      })
    ).map((l) => l.codigo),
  );

  const { centro, unidad } = VOLUMEN_DIARIO[materia];
  const filas: Partial<Lote>[] = [];

  // Desde ayer hacia atrás: el día de hoy no lo usa la serie de forma
  // estable (el cron corre a las 3 AM).
  for (let diasAtras = 1; diasAtras <= dias; diasAtras++) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - diasAtras);

    const totalDia = centro * FACTOR_DIA_SEMANA[fecha.getDay()] * (0.9 + Math.random() * 0.2);
    const lotesDelDia = 2 + Math.floor(Math.random() * 2); // 2 o 3

    for (let n = 0; n < lotesDelDia; n++) {
      const codigo = `${PREFIJO_CODIGO}-${materia}-${formatearFecha(fecha)}-${n + 1}`;
      if (existentes.has(codigo)) continue;

      // Horario de recepción 7-16hs. Mediodía-ish evita que el desfase de
      // huso horario del backend corra el lote a otro día.
      const fechaIngreso = new Date(fecha);
      fechaIngreso.setHours(7 + n * 4, Math.floor(Math.random() * 60), 0, 0);

      const cantidad = Math.round((totalDia / lotesDelDia) * 100) / 100;

      filas.push({
        codigo,
        empresaId,
        proveedorId: tambo.proveedorId,
        tamboId: tambo.id,
        materiaPrima: materia,
        fechaIngreso,
        estado: EstadoLote.FINALIZADO,
        cantidad,
        cantidadDisponible: 0,
        unidadCantidad: unidad,
        numeroRemito: `SEED-${formatearFecha(fecha)}-${n + 1}`,
      });
    }
  }

  if (filas.length === 0) {
    console.log('Nada para insertar: los lotes de seed para ese rango ya existen.');
  } else {
    console.log(`Lotes a insertar: ${filas.length} (${dias} días, materia prima ${materia})`);
    const TAMANIO_LOTE_INSERT = 200;
    for (let i = 0; i < filas.length; i += TAMANIO_LOTE_INSERT) {
      await loteRepo.insert(filas.slice(i, i + TAMANIO_LOTE_INSERT));
    }
    console.log('Lotes insertados.');
  }

  await dataSource.destroy();

  if (generar) {
    console.log('Generando predicción (lo mismo que el cron de las 3 AM)...');
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });
    try {
      await app.get(PrediccionVolumenService).generarYPersistir(empresaId, materia);
    } finally {
      await app.close();
    }
    console.log('Listo. Recargá la pantalla de predicción en el front.');
  } else {
    console.log(
      'Listo. La predicción se regenera en el próximo cron (3 AM). Para no esperar, ' +
        'volvé a correr el script con --generar.',
    );
  }

  console.log(`Para limpiar: DELETE FROM lotes WHERE codigo LIKE '${PREFIJO_CODIGO}-%';`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
