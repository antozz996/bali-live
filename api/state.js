'use strict';

const { CloudStateStore, createCloudPool } = require('../backend/cloud-state');
const { verifyGoogleAccessToken } = require('../backend/google-auth');
const { validateState } = require('../backend/app');

const pool = createCloudPool();
const store = pool ? new CloudStateStore(pool) : null;

function bearerToken(request) {
  const value = String(request.headers?.authorization || '');
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

function createStateHandler(options = {}) {
  const stateStore = options.store === undefined ? store : options.store;
  const verifyToken = options.verifyToken || verifyGoogleAccessToken;
  return async function stateHandler(request, response) {
    if (!['GET', 'PUT'].includes(request.method)) {
      response.setHeader('Allow', 'GET, PUT');
      return response.status(405).json({ error: 'Metodo non consentito' });
    }
    if (!stateStore) return response.status(503).json({ error: 'Database cloud non configurato' });
    if (Number(request.headers?.['content-length'] || 0) > 1024 * 1024) return response.status(413).json({ error: 'Payload troppo grande' });
    try {
      const user = await verifyToken(bearerToken(request));
      if (request.method === 'GET') return response.status(200).json(await stateStore.read(user));
      const body = request.body && typeof request.body === 'object' ? request.body : {};
      return response.status(200).json(await stateStore.write(user, validateState(body.state)));
    } catch (error) {
      console.error('Vercel state function:', error.statusCode ? error.message : error);
      return response.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Errore sincronizzazione cloud' });
    }
  };
}

module.exports = createStateHandler();
module.exports.createStateHandler = createStateHandler;
