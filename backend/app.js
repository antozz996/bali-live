'use strict';

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { StateStore } = require('./state-store');
const { WeatherService } = require('./weather');
const { ExchangeService } = require('./exchange');

const ROOT = path.resolve(__dirname, '..');
const MAX_BODY_BYTES = 1024 * 1024;
const ALLOWED_STATE_KEYS = new Set([
  'bali_budget_items_v2', 'bali_paid_items_custom', 'bali_itinerary_v1',
  'bali_accommodations_v1', 'bali_food_v2', 'bali_checklist_items_v1',
  'bali_checklist_state', 'bali_pianob_v1', 'bali_drivers_v1',
  'bali_photos_v1', 'bali_excursions_v1', 'bali_user_expenses',
  'bali_bookings_v1', 'bali_reminder_state', 'bali_exchange_rate_v1'
]);

const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
});
const PUBLIC_FILES = new Set(['/index.html', '/privacy.html', '/styles.css', '/app.js', '/features.js', '/vault.js', '/data.js', '/sw.js', '/manifest.json', '/icons/icon.svg', '/icons/icon-maskable.svg']);

function securityHeaders(contentType) {
  return {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
    'Content-Security-Policy': "default-src 'self'; connect-src 'self' https://accounts.google.com https://www.googleapis.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://accounts.google.com; font-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; frame-src https://accounts.google.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  };
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, { ...securityHeaders('application/json; charset=utf-8'), 'Cache-Control': 'no-store', ...extraHeaders });
  res.end(JSON.stringify(payload));
}

function isAuthorized(req, token) {
  if (!token) return false;
  return req.headers.authorization === `Bearer ${token}`;
}

async function readJsonBody(req) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) {
      const error = new Error('Payload troppo grande');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    const error = new Error('JSON non valido');
    error.statusCode = 400;
    throw error;
  }
}

function validateState(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const error = new Error('Stato non valido');
    error.statusCode = 400;
    throw error;
  }
  return Object.fromEntries(Object.entries(input).filter(([key]) => ALLOWED_STATE_KEYS.has(key)));
}

async function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  let decoded;
  try { decoded = decodeURIComponent(requested); } catch { return sendJson(res, 400, { error: 'Percorso non valido' }); }
  if (!PUBLIC_FILES.has(decoded)) return sendJson(res, 404, { error: 'Risorsa non trovata' });
  const filePath = path.resolve(ROOT, `.${decoded}`);
  if (!filePath.startsWith(`${ROOT}${path.sep}`)) return sendJson(res, 403, { error: 'Accesso negato' });

  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) return sendJson(res, 404, { error: 'Risorsa non trovata' });
    const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    const cacheControl = type.startsWith('text/html') ? 'no-cache' : 'public, max-age=3600';
    res.writeHead(200, {
      ...securityHeaders(type),
      'Cache-Control': cacheControl,
      'Content-Length': stat.size
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    if (error.code === 'ENOENT') return sendJson(res, 404, { error: 'Risorsa non trovata' });
    throw error;
  }
}

function createApp(options = {}) {
  const stateStore = options.stateStore || new StateStore(path.join(ROOT, '.data', 'state.json'));
  const weatherService = options.weatherService || new WeatherService();
  const exchangeService = options.exchangeService || new ExchangeService();
  const syncToken = options.syncToken ?? process.env.BALI_SYNC_TOKEN;

  return http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url, 'http://localhost');
    try {
      if (requestUrl.pathname === '/api/health' && req.method === 'GET') {
        return sendJson(res, 200, { status: 'ok', service: 'bali-live', stateSyncEnabled: Boolean(syncToken) });
      }

      if (requestUrl.pathname === '/api/weather' && req.method === 'GET') {
        const force = requestUrl.searchParams.get('refresh') === '1';
        const weather = await weatherService.getWeather({ force });
        return sendJson(res, 200, weather, { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' });
      }

      if (requestUrl.pathname === '/api/exchange' && req.method === 'GET') {
        const force = requestUrl.searchParams.get('refresh') === '1';
        return sendJson(res, 200, await exchangeService.getRate({ force }), { 'Cache-Control': 'public, max-age=21600, stale-while-revalidate=86400' });
      }

      if (requestUrl.pathname === '/api/config' && req.method === 'GET') {
        return sendJson(res, 200, {
          googleClientId: process.env.GOOGLE_CLIENT_ID || '',
          googleLoginEnabled: Boolean(process.env.GOOGLE_CLIENT_ID),
          cloudSyncEnabled: false
        }, { 'Cache-Control': 'no-store' });
      }

      if (requestUrl.pathname === '/api/state') {
        if (!syncToken) return sendJson(res, 503, { error: 'Sincronizzazione server non configurata' });
        if (!isAuthorized(req, syncToken)) return sendJson(res, 401, { error: 'Token di sincronizzazione non valido' });
        if (req.method === 'GET') return sendJson(res, 200, await stateStore.read());
        if (req.method === 'PUT') {
          const body = await readJsonBody(req);
          const state = validateState(body.state);
          return sendJson(res, 200, await stateStore.write(state));
        }
        return sendJson(res, 405, { error: 'Metodo non consentito' }, { Allow: 'GET, PUT' });
      }

      if (requestUrl.pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'API non trovata' });
      if (!['GET', 'HEAD'].includes(req.method)) return sendJson(res, 405, { error: 'Metodo non consentito' });
      return await serveStatic(req, res, requestUrl.pathname);
    } catch (error) {
      console.error(error);
      return sendJson(res, error.statusCode || 500, { error: error.statusCode ? error.message : 'Errore interno del server' });
    }
  });
}

module.exports = { createApp, validateState, ALLOWED_STATE_KEYS };
