# Demo en vivo

Módulo para la presentación pública. Cada visitante juega desde su celular
(`public/demo.html` del frontend) y el celular actúa como sensor de
temperatura de un lote de la empresa demo. Las lecturas entran por el flujo
real: ingesta → umbrales → clasificación → alertas → WebSocket.

## Activación

Solo existe con `DEMO_MODE=true`. Sin ese flag el módulo no se registra y
`/demo/*` responde 404. Con el flag, estas variables son obligatorias (si
falta alguna, la app no arranca):

| Variable            | Qué es                                                        |
| ------------------- | ------------------------------------------------------------- |
| `DEMO_EMPRESA_ID`   | Empresa "Demo". Todo queda aislado a ella.                    |
| `DEMO_USUARIO_ID`   | Usuario de esa empresa que figura como autor de las asociaciones sensor → lote. |
| `DEMO_PROVEEDOR_ID` | Proveedor **activo** de la empresa demo.                      |
| `DEMO_TAMBO_ID`     | Tambo **activo** de ese proveedor.                            |

## Configuración necesaria de la empresa demo

`npm run seed:demo` deja todo esto listo en la base del `.env` (es
idempotente) e imprime los IDs para las variables de arriba.

1. **Sensores**: uno por puesto, con `parametro = temperatura`, estado
   `activo` y nombre exactamente `Sensor N · libre` (N distinto en cada uno;
   el separador es ` · `, con espacios). Son exclusivos de la demo: al tomar
   un turno pasan a `Sensor N · {nombre}` y la ingesta identifica al sensor
   por nombre, así que ningún simulador ni PLC debe mandarles lecturas.
   El seed les pone `umbralDesconexionMinutos = 525600` (un año) para que el
   cron de desconexión no alerte mientras no hay visitantes.
2. **Umbral** de temperatura para `leche_cruda` (Configuración de
   parámetros). Define APTO/NO_APTO, los desvíos y las alertas. El lote
   arranca con la temperatura en el punto medio del rango.
3. **Destinatarios de alertas para los 3 niveles** (informativa,
   advertencia y crítica), **incluido el usuario logueado en la tele**. La
   alerta de umbral se emite por WebSocket solo a los destinatarios
   configurados (room por usuario); si un nivel no tiene destinatarios, no
   se crea ninguna alerta de ese nivel.
4. **Sin horario de silencio**: en horario de silencio las alertas
   informativas se guardan pero no se emiten por WebSocket.
5. Para ver también las notificaciones de "lote no apto", el usuario de la
   tele tiene que tener rol Responsable de Calidad (es a quienes se
   notifica). Las alertas de anomalía van a los responsables de producción.
6. **Destinos productivos** cargados con los nombres que devuelve el
   microservicio de IA; si no coincide ninguno, el destino sugerido es
   `null`.

## Endpoints (públicos, sin JWT)

| Método | Ruta                         | Qué hace |
| ------ | ---------------------------- | -------- |
| POST   | `/demo/turno`                | `{ sensorId?, nombre }` → crea el lote (`DEMO-{sensorId}-{timestamp}`), le asocia el sensor y lo renombra. Sin `sensorId` asigna el sensor disponible (libre o con el turno vencido) de menor N. Devuelve `{ loteId, sensorId, numero }`. Puede tardar hasta 3 s si la IA no responde. |
| POST   | `/demo/lecturas`             | `{ loteId, sensorId, valor }` → `LecturaSensorService.ingresar()`. |
| POST   | `/demo/turno/:loteId/fin`    | Libera el sensor, clasifica (sincrónico), pide el destino a la IA con la última lectura y devuelve el resumen. |
| GET    | `/demo/lotes/:id/resumen`    | El mismo resumen, solo lectura (por si se recarga la página). |
| GET    | `/demo/tablero`              | Para la tele: cada sensor con su visitante, lote, última temperatura, semáforo (umbralMin/Max), clasificación, desvíos y alertas. Seis consultas fijas. Un sensor libre, o con un turno vencido (más de 60 s sin actividad, el mismo criterio que permite tomarlo), muestra su último turno con `ocupado: false`. Cada fila trae el `estado` del sensor y `disponible` (activo y no ocupado: se puede tomar). |

Resumen: `estado` (APTO/NO_APTO), `desvios` (episodios: veces que la
lectura pasó de dentro a fuera del umbral), `alertas` (sin repetir por
destinatario), `destinoSugerido` (`null` si la IA no respondió) y
`eventos` de trazabilidad.

## Reglas

- Sensor ocupado → 409, salvo que lleve más de 60 s sin actividad (última
  lectura o, si no hay lecturas, inicio del turno): ahí se puede tomar.
- La toma del sensor es atómica: un `UPDATE ... WHERE nombre = <el leído>`.
  Si dos visitantes eligen el mismo sensor a la vez, uno recibe 409. Si
  después falla crear o asociar el lote, el sensor vuelve a `· libre`.
- Con `sensorId`, un sensor que no está `activo` → 409, antes de renombrarlo
  o crear el lote.
- Sin `sensorId`: se recorren los sensores ACTIVOS por N y se toma el
  primero libre o vencido, con la misma toma atómica; si otro visitante lo
  gana en el medio, se prueba con el siguiente. Si no queda ninguno → 409
  "Todos los sensores están en uso".
- Valor fuera del rango físico (`RANGOS_FISICOS`) → 400, antes de la
  ingesta, para que el sensor no quede en FALLA.
- Lecturas con el turno terminado (`· libre`) → 409.
- `/fin` solo libera el sensor (y genera la recomendación) si la última
  asociación del sensor es ese lote y nadie lo está tomando en ese momento.
  Si no, devuelve el resumen sin tocar el sensor.
- Rate limit: `/demo/turno` 60 por minuto por IP (el día del evento todos
  los visitantes comparten la del wifi; se toma el último valor de
  `X-Forwarded-For`, el que agrega el proxy de Railway; sin header,
  `req.ip`); `/demo/lecturas` 10 por segundo por `loteId`. `/demo/tablero`
  no tiene rate limit, pero cachea la respuesta 1 s. Los contadores, el
  cache y la marca de "toma en curso" viven en memoria: una sola
  instancia.

## Puesta en producción (Railway)

### 1. Seed, una sola vez antes del evento

`seed:demo` usa `ts-node` (dependencia de desarrollo), así que se corre
desde una máquina local apuntando a la base de Railway, no dentro del
contenedor. Las migraciones tienen que estar aplicadas (las corre el
deploy).

1. En Railway, servicio Postgres → *Connect* → datos de la conexión
   **pública** (TCP proxy: host y puerto). La dirección interna
   (`*.railway.internal`) no es accesible desde afuera.
2. Correr el seed pasando esos datos por variables de entorno (pisan a
   las del `.env` local, dotenv no las sobrescribe):

   ```bash
   DB_HOST=<host público> DB_PORT=<puerto público> \
   DB_USERNAME=<usuario> DB_PASSWORD=<contraseña> DB_NAME=<base> \
   DEMO_SEED_PASSWORD=<contraseña para el usuario de la tele> \
   npm run seed:demo
   ```

3. Guardar el bloque `DEMO_*` que imprime al final.

**No correrlo durante la presentación**: vuelve todos los sensores a
`· libre` (corta los turnos en curso) y borra los horarios de silencio de
la empresa demo. Se puede volver a correr antes del evento sin problema
(es idempotente).

### 2. Variables en el servicio del backend

En Railway → servicio backend → *Variables*:

```
DEMO_MODE=true
DEMO_EMPRESA_ID=<del seed>
DEMO_USUARIO_ID=<del seed>
DEMO_PROVEEDOR_ID=<del seed>
DEMO_TAMBO_ID=<del seed>
```

Guardar dispara un redeploy. `FRONTEND_URL` tiene que incluir el origen
desde el que se sirve `public/demo.html` (CORS); si es el mismo dominio
del frontend, ya está.

Verificar después del deploy:

- `GET /demo/tablero` responde 200 con los 8 sensores.
- En los logs del backend, el primer `POST /demo/turno` imprime
  `[temporal] X-Forwarded-For="…" req.ip=…`. Confirmar que el último
  valor del header es la IP real del celular (y distinta entre dos
  redes). Después, sacar ese log de `demo-ip-throttler.guard.ts`.

### 3. Apagar todo después

- `DEMO_MODE=false` (o borrar la variable) → redeploy. Los endpoints
  `/demo/*` dejan de existir (404). Las `DEMO_*` restantes se pueden
  borrar; sin el flag no se leen.
- Los datos de la empresa demo (lotes `DEMO-…`, lecturas, alertas)
  quedan en la base. Si no se quieren ver más, desactivar la empresa
  demo (`PATCH /empresa/:id/desactivar`, con la cuenta de administrador).
