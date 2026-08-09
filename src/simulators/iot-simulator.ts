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
  empresaId?: number; // agregado para poder filtrar
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

/**
 * Sesión mutable compartida entre las funciones que envían lecturas.
 * Se actualiza in-place cuando el access token se refresca, así todos los
 * loops (setInterval, burst) ven el token nuevo sin tener que replantear
 * su firma con callbacks.
 */
interface Sesion {
  token: string;
  refreshToken: string;
  empresaId: number;
}

async function login(
  url: string,
  email: string,
  password: string,
): Promise<{ token: string; refreshToken: string; empresaId: number }> {
  const res = await fetch(`${url}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login falló (HTTP ${res.status}): ${await res.text()}`);
  }
  const body = await res.json();
  return {
    token: body.access_token,
    refreshToken: body.refresh_token,
    empresaId: body.user.empresaId,
  };
}

/** Renueva el access token vía POST /refresh (rotación), sin re-hacer login. */
async function refrescarToken(
  url: string,
  refreshToken: string,
): Promise<{ token: string; refreshToken: string }> {
  const res = await fetch(`${url}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    throw new Error(`Refresh falló (HTTP ${res.status}): ${await res.text()}`);
  }
  const body = await res.json();
  return { token: body.access_token, refreshToken: body.refresh_token };
}

// Evita que dos lecturas en paralelo (setInterval dispara una por sensor a
// la vez, burst dispara todas juntas) disparen cada una su propio
// login/refresh cuando el token expira — todas esperan la misma promesa.
let reautenticacionEnCurso: Promise<void> | null = null;

/**
 * Refresca la sesión in-place. Intenta primero POST /refresh (rotación,
 * sin exponer la contraseña de nuevo); si el refresh token también está
 * vencido/inválido, cae a un login completo con las credenciales del
 * simulador (cuenta de servicio, es un caso de uso válido).
 */
async function reautenticar(
  url: string,
  sesion: Sesion,
  args: Args,
  tokenQueFallo: string,
): Promise<void> {
  // Si otra lectura concurrente ya refrescó la sesión mientras esta request
  // estaba en vuelo, el token actual ya no es el que dio 401 — no hace
  // falta pegarle de nuevo al backend, alcanza con reintentar con el nuevo.
  if (sesion.token !== tokenQueFallo) {
    return;
  }
  if (reautenticacionEnCurso) {
    return reautenticacionEnCurso;
  }
  reautenticacionEnCurso = (async () => {
    console.log('Token expirado, re-autenticando...');
    try {
      const nuevo = await refrescarToken(url, sesion.refreshToken);
      sesion.token = nuevo.token;
      sesion.refreshToken = nuevo.refreshToken;
      console.log('Re-autenticación exitosa (refresh token).');
    } catch (err) {
      console.warn(
        `Refresh token falló (${(err as Error).message}); reintentando con login completo...`,
      );
      const nuevo = await login(url, args.email, args.password);
      sesion.token = nuevo.token;
      sesion.refreshToken = nuevo.refreshToken;
      sesion.empresaId = nuevo.empresaId;
      console.log('Re-autenticación exitosa (login completo).');
    }
  })();
  try {
    await reautenticacionEnCurso;
  } finally {
    reautenticacionEnCurso = null;
  }
}

async function obtenerSensoresAsociados(
  url: string,
  token: string,
  empresaId: number,
): Promise<SensorSimulable[]> {
  const headers = { Authorization: `Bearer ${token}` };

  const sensoresRes = await fetch(`${url}/sensores`, { headers });
  if (!sensoresRes.ok) {
    throw new Error(`No se pudo listar sensores (HTTP ${sensoresRes.status})`);
  }
  const sensores = (await sensoresRes.json()) as SensorInfo[];

  // 🔑 Filtrar por empresa
  const asociados = sensores.filter(
    (s) => s.loteActualId != null && s.empresaId === empresaId,
  );
  if (asociados.length === 0) return [];

  const lotesRes = await fetch(`${url}/lotes?limit=500`, { headers });
  if (!lotesRes.ok) {
    throw new Error(`No se pudo listar lotes (HTTP ${lotesRes.status})`);
  }
  const { data: lotes } = (await lotesRes.json()) as {
    data: { id: number; codigo: string; empresaId: number }[];
  };

  const codigoPorLoteId = new Map(
    lotes.filter((l) => l.empresaId === empresaId).map((l) => [l.id, l.codigo]),
  );

  return asociados
    .map((s) => ({
      ...s,
      loteCodigo: codigoPorLoteId.get(s.loteActualId as number),
    }))
    .filter((s): s is SensorSimulable => !!s.loteCodigo);
}

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
  sesion: Sesion,
  sensor: SensorSimulable,
  valor: number,
  args: Args,
  esReintento = false,
): Promise<void> {
  const tokenUsado = sesion.token;
  const res = await fetch(`${url}/sensores/lecturas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenUsado}`,
    },
    body: JSON.stringify({
      sensor_id: sensor.nombre,
      lote_id: sensor.loteCodigo,
      valor,
      timestamp: new Date().toISOString(),
    }),
  });

  if (res.status === 401 && !esReintento) {
    await res.text().catch(() => null); // drenar body, no nos interesa el detalle acá
    try {
      await reautenticar(url, sesion, args, tokenUsado);
    } catch (err) {
      console.error(
        `[401] ${sensor.nombre}: no se pudo re-autenticar (${(err as Error).message}). Se reintentará en el próximo ciclo.`,
      );
      return;
    }
    return enviarLectura(url, sesion, sensor, valor, args, true);
  }

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

  const sesionInicial = await login(args.url, args.email, args.password);
  const sesion: Sesion = { ...sesionInicial };
  const sensores = await obtenerSensoresAsociados(
    args.url,
    sesion.token,
    sesion.empresaId,
  );

  if (sensores.length === 0) {
    console.error(
      `No hay sensores asociados a un lote de la empresa ${sesion.empresaId}. Asociá al menos uno (PATCH /sensores/lote/:loteId/asociar) antes de simular.`,
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
        sesion,
        sensor,
        generarValor(sensor, 'normal'),
        args,
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
        sesion,
        sensor,
        generarValor(sensor, args.modo),
        args,
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
