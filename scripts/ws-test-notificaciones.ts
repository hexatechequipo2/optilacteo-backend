/**
 * Cliente de prueba para el WebSocket de notificaciones (namespace
 * /notificaciones, HU-26/HU-30).
 *
 * Se conecta con un JWT (el mismo que devuelve POST /login) y loguea todo lo
 * que llega por notificacion:nueva. Sirve para verificar manualmente que
 * NotificacionesGateway emite (o no emite, en el caso de HU-30) lo esperado.
 *
 * Uso:
 *   npm run ws:test:notificaciones -- <JWT> [url base, default http://localhost:3000]
 *
 * o directamente:
 *   npx ts-node scripts/ws-test-notificaciones.ts <JWT> [url]
 */

import { io } from 'socket.io-client';

const token = process.argv[2];
const url = process.argv[3] || 'http://localhost:3000';

if (!token) {
  console.error(
    'Uso: npm run ws:test:notificaciones -- <JWT> [url base, default http://localhost:3000]',
  );
  process.exit(1);
}

const socket = io(`${url}/notificaciones`, {
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

socket.on('notificacion:nueva', (data) => {
  console.log('[notificacion:nueva]', JSON.stringify(data, null, 2));
});

console.log(`Conectando a ${url}/notificaciones ...`);