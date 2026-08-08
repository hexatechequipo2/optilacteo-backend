#!/bin/sh
# Entry point del contenedor de producción (Railway).
#
# El server es el único hard requirement de este script una vez que arrancó:
# ni el simulador IoT ni el wait-on que lo precede pueden tirar abajo el
# contenedor si fallan. Solo las migraciones son hard requirement previo al
# arranque (no queremos un server corriendo contra un schema desactualizado).
#
# El script queda "colgado" del PID del server (wait "$SERVER_PID") para que
# sea el server quien sostiene vivo al contenedor, no la cadena de comandos
# de deploy.
set -e

# Al correr como CMD directo (no vía "npm run"), npm no nos inyecta
# node_modules/.bin en el PATH — lo agregamos a mano para poder invocar
# wait-on como comando.
export PATH="$PWD/node_modules/.bin:$PATH"

echo "[deploy] Corriendo migraciones..."
npm run migration:run:prod

echo "[deploy] Levantando el server..."
node dist/main &
SERVER_PID=$!

# Si Docker/Railway mandan SIGTERM (redeploy, stop, restart), lo reenviamos
# al server para que cierre en limpio en vez de que el contenedor quede
# esperando el timeout de kill forzado.
trap 'echo "[deploy] Señal recibida, deteniendo el server (pid $SERVER_PID)..."; kill -TERM "$SERVER_PID" 2>/dev/null; wait "$SERVER_PID"; exit $?' TERM INT

PORT_TO_CHECK="${PORT:-3000}"

if wait-on -t 60000 "http://localhost:${PORT_TO_CHECK}/health"; then
  echo "[deploy] Server respondiendo en /health. Corriendo simulador IoT..."
  if ! npm run simulate:iot:prod; then
    echo "[deploy] WARNING: simulate:iot:prod falló. El server sigue arriba." >&2
  fi
else
  echo "[deploy] WARNING: wait-on agotó el timeout esperando /health. Se saltea el simulador; el server sigue arriba." >&2
fi

echo "[deploy] Deploy listo. El contenedor queda sostenido por el server (pid $SERVER_PID)."
wait "$SERVER_PID"
