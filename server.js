'use strict';

const { createApp } = require('./backend/app');

const port = Number.parseInt(process.env.PORT || '8765', 10);
const host = process.env.HOST || '127.0.0.1';
const server = createApp();

server.listen(port, host, () => {
  console.log(`Bali Live disponibile su http://${host}:${port}`);
});

function shutdown(signal) {
  console.log(`\n${signal}: arresto del server...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
