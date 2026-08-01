'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const healthHandler = require('../api/health');
const { createWeatherHandler } = require('../api/weather');

function mockResponse() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('Vercel health function risponde senza abilitare la sync effimera', () => {
  const response = mockResponse();
  healthHandler({ method: 'GET' }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.stateSyncEnabled, false);
});

test('Vercel weather function restituisce il payload del servizio e la cache CDN', async () => {
  const payload = { source: 'Open-Meteo', locations: [{ id: 'ubud' }] };
  const calls = [];
  const handler = createWeatherHandler({
    async getWeather(options) { calls.push(options); return payload; }
  });
  const response = mockResponse();

  await handler({ method: 'GET', query: { refresh: '1' } }, response);

  assert.deepEqual(calls, [{ force: true }]);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, payload);
  assert.match(response.headers['Cache-Control'], /s-maxage=300/);
});

test('Vercel weather function rifiuta metodi diversi da GET', async () => {
  const response = mockResponse();
  await createWeatherHandler({ getWeather: async () => ({}) })({ method: 'POST', query: {} }, response);
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, 'GET');
});
