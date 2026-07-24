import 'dotenv/config';

/**
 * Simulador de sensores IoT — HU-13.
 *
 * Reemplaza al PLC físico mientras no exista integración con hardware real
 * (protocolo aún no definido: Modbus TCP, OPC-UA, Profinet, S7, etc.). Es
 * fuente de datos simulada por decisión de producto, no un parche temporal:
 * le pega al mismo endpoint (`POST /sensores/lecturas`) con el mismo
 * contrato que usaría un PLC real, autenticado como un usuario más de la API
 * (cuenta de servicio). El día que se conecte un PLC/gateway real, solo debe
 * apuntar a este mismo endpoint — no requiere tocar backend ni UI.
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register src/simulators/iot-simulator.ts \
 *     --modo=normal --email=iot@optilacteo.com --password=<tu-password>
 *
 * Modos:
 *   normal  lecturas válidas, dentro del rango favorable del sensor.
 *   noise   mezcla lecturas válidas con valores fuera de rango físico (422).
 *   burst   ráfaga de --burst lecturas (default 200) en paralelo.
 *   stop    no envía nada — simula el PLC caído, para probar la detección
 *           de inactividad del cron.
 *
 * Requiere que los sensores ya estén asociados a un lote (vía la API) antes
 * de correr el simulador — los descubre solo, no crea sensores ni lotes.
 */

interface SensorInfo {
  id: number;
  nombre: string;
  parametro: string;
  rangoMinFavor: string | number;
  rangoMaxFavor: string | number;
  loteActualId: number | null;
}

interface SensorSimulable extends SensorInfo {
  loteCodigo: string;
}

interface Args {
  modo: 'normal' | 'noise' | 'burst' | 'stop';
  url: string;
  email: string;
  password: string;
  intervaloMs: number;
  burstCount: number;
}

const MODOS_VALIDOS = ['normal', 'noise', 'burst', 'stop'] as const;

function parseArgs(): Args {
  const raw = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    raw.set(key, rest.join('=') || 'true');
  }

  const modo = raw.get('modo') ?? 'normal';
  if (!MODOS_VALIDOS.includes(modo as Args['modo'])) {
    throw new Error(
      `Modo inválido: "${modo}". Usar: ${MODOS_VALIDOS.join(' | ')}.`,
    );
  }

  return {
    modo: modo as Args['modo'],
    url: raw.get('url') ?? process.env.SIMULATOR_URL ?? 'http://localhost:3000',
    email: raw.get('email') ?? process.env.SIMULATOR_EMAIL ?? '',
    password: raw.get('password') ?? process.env.SIMULATOR_PASSWORD ?? '',
    intervaloMs: Number(raw.get('intervalo') ?? 5000),
    burstCount: Number(raw.get('burst') ?? 200),
  };
}

async function login(
  url: string,
  email: string,
  password: string,
): Promise<string> {
  if (!email || !password) {
    throw new Error(
      'Faltan credenciales: pasá --email/--password o seteá SIMULATOR_EMAIL/SIMULATOR_PASSWORD.',
    );
  }
  const res = await fetch(`${url}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login falló (HTTP ${res.status}): ${await res.text()}`);
  }
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
}

async function obtenerSensoresAsociados(
  url: string,
  token: string,
): Promise<SensorSimulable[]> {
  const headers = { Authorization: `Bearer ${token}` };

  const sensoresRes = await fetch(`${url}/sensores`, { headers });
  if (!sensoresRes.ok) {
    throw new Error(`No se pudo listar sensores (HTTP ${sensoresRes.status})`);
  }
  const sensores = (await sensoresRes.json()) as SensorInfo[];
  const asociados = sensores.filter((s) => s.loteActualId != null);
  if (asociados.length === 0) return [];

  const lotesRes = await fetch(`${url}/lotes?limit=500`, { headers });
  if (!lotesRes.ok) {
    throw new Error(`No se pudo listar lotes (HTTP ${lotesRes.status})`);
  }
  const { data: lotes } = (await lotesRes.json()) as {
    data: { id: number; codigo: string }[];
  };
  const codigoPorLoteId = new Map(lotes.map((l) => [l.id, l.codigo]));

  return asociados
    .map((s) => ({
      ...s,
      loteCodigo: codigoPorLoteId.get(s.loteActualId as number),
    }))
    .filter((s): s is SensorSimulable => !!s.loteCodigo);
}

// En modo "noise" fuerza ocasionalmente un valor fuera de cualquier rango
// físico posible (todos los RANGOS_FISICOS del backend están dentro de
// [-20, 100]), para ejercitar el rechazo 422 sin duplicar esa tabla acá.
function generarValor(sensor: SensorSimulable, modo: Args['modo']): number {
  if (modo === 'noise' && Math.random() < 0.3) {
    return Math.random() < 0.5 ? -99999 : 99999;
  }

  const min = Number(sensor.rangoMinFavor);
  const max = Number(sensor.rangoMaxFavor);
  const valor = min + Math.random() * (max - min);
  return Number(valor.toFixed(2));
}

async function enviarLectura(
  url: string,
  token: string,
  sensor: SensorSimulable,
  valor: number,
): Promise<void> {
  const res = await fetch(`${url}/sensores/lecturas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      sensor_id: sensor.nombre,
      lote_id: sensor.loteCodigo,
      valor,
      timestamp: new Date().toISOString(),
    }),
  });
  const detalle = res.ok
    ? ''
    : ` ${JSON.stringify(await res.json().catch(() => null))}`;
  console.log(
    `[${res.status}] ${sensor.nombre} -> ${sensor.loteCodigo} valor=${valor}${detalle}`,
  );
}

async function main(): Promise<void> {
  const args = parseArgs();
  console.log(`Simulador IoT — modo: ${args.modo}`);

  if (args.modo === 'stop') {
    console.log(
      'Modo stop: no se envía ninguna lectura (simula el PLC caído). ' +
        'Dejá pasar el umbral de SENSOR_INACTIVIDAD_UMBRAL_MINUTOS para ver ' +
        'al cron marcar los sensores en falla.',
    );
    return;
  }

  const token = await login(args.url, args.email, args.password);
  const sensores = await obtenerSensoresAsociados(args.url, token);

  if (sensores.length === 0) {
    console.error(
      'No hay sensores asociados a un lote. Asociá al menos uno (PATCH /sensores/lote/:loteId/asociar) antes de simular.',
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `Sensores detectados: ${sensores.map((s) => s.nombre).join(', ')}`,
  );

  if (args.modo === 'burst') {
    const tareas = Array.from({ length: args.burstCount }, (_, i) => {
      const sensor = sensores[i % sensores.length];
      return enviarLectura(
        args.url,
        token,
        sensor,
        generarValor(sensor, 'normal'),
      );
    });
    await Promise.all(tareas);
    console.log(`Ráfaga completa: ${args.burstCount} lecturas enviadas.`);
    return;
  }

  console.log(
    `Enviando una lectura por sensor cada ${args.intervaloMs}ms. Ctrl+C para detener.`,
  );
  const emitirCiclo = () => {
    for (const sensor of sensores) {
      void enviarLectura(
        args.url,
        token,
        sensor,
        generarValor(sensor, args.modo),
      );
    }
  };
  emitirCiclo();
  setInterval(emitirCiclo, args.intervaloMs);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
