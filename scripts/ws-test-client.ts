/**
 * Cliente de prueba para el WebSocket de HU-13 (namespace /sensores).
 *
 * Se conecta con un JWT (el mismo que devuelve POST /login) y loguea todo lo
 * que llega por lectura:nueva, sensor:falla y sensor:recuperado. Sirve para
 * verificar manualmente que el gateway emite lo esperado sin tener que armar
 * una UI — pensado para usarse junto con src/simulators/iot-simulator.ts.
 *
 * Uso:
 *   npm run ws:test -- <JWT> [url base, default http://localhost:3000]
 *
 * o directamente:
 *   npx ts-node scripts/ws-test-client.ts <JWT> [url]
 */

import { io } from 'socket.io-client';

const token = process.argv[2];
const url = process.argv[3] || 'http://localhost:3000';

if (!token) {
  console.error(
    'Uso: npm run ws:test -- <JWT> [url base, default http://localhost:3000]',
  );
  process.exit(1);
}

const socket = io(`${url}/sensores`, {
  auth: { token },
});

socket.on('connect', () => {
  console.log(`[conectado] socket id: ${socket.id}`);
});

socket.on('connect_error', (err) => {
  console.error('[connect_error]', err.message);
});

socket.on('disconnect', (reason) => {
  console.log('[desconectado]', reason);
});

socket.on('lectura:nueva', (data) => {
  console.log('[lectura:nueva]', JSON.stringify(data, null, 2));
});

socket.on('sensor:falla', (data) => {
  console.log('[sensor:falla]', JSON.stringify(data, null, 2));
});

socket.on('sensor:inactivo', (data) => {
  console.log('[sensor:inactivo]', JSON.stringify(data, null, 2));
});

socket.on('sensor:recuperado', (data) => {
  console.log('[sensor:recuperado]', JSON.stringify(data, null, 2));
});

console.log(`Conectando a ${url}/sensores ...`);
