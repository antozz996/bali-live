'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../backend/app');
const { StateStore } = require('../backend/state-store');
const { WeatherService } = require('../backend/weather');

async function withServer(options, callback) {
  const server = createApp(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try { await callback(`http://127.0.0.1:${port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('StateStore salva e rilegge uno snapshot atomico', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'bali-state-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = new StateStore(path.join(directory, 'state.json'));
  assert.deepEqual((await store.read()).state, {});
  const written = await store.write({ bali_food_v2: [{ id: 'FOOD-1' }] });
  assert.ok(written.updatedAt);
  assert.deepEqual((await store.read()).state.bali_food_v2, [{ id: 'FOOD-1' }]);
});

test('API protegge lo stato e non espone file privati', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'bali-api-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const stateStore = new StateStore(path.join(directory, 'state.json'));
  const weatherService = { getWeather: async () => ({ source: 'test', fetchedAt: new Date().toISOString(), locations: [] }) };
  const exchangeService = { getRate: async () => ({ source: 'test', rate: 20000, asOf: '2026-08-02' }) };
  await withServer({ stateStore, weatherService, exchangeService, syncToken: 'secret' }, async baseUrl => {
    assert.equal((await fetch(`${baseUrl}/api/health`)).status, 200);
    assert.equal((await (await fetch(`${baseUrl}/api/exchange`)).json()).rate, 20000);
    assert.equal((await (await fetch(`${baseUrl}/api/config`)).json()).googleLoginEnabled, false);
    assert.equal((await fetch(`${baseUrl}/api/state`)).status, 401);
    assert.equal((await fetch(`${baseUrl}/.git/config`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/backend/app.js`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/privacy.html`)).status, 200);

    const put = await fetch(`${baseUrl}/api/state`, {
      method: 'PUT',
      headers: { Authorization: 'Bearer secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: { bali_food_v2: [{ id: 'FOOD-1' }], forbidden: 'drop-me' } })
    });
    assert.equal(put.status, 200);
    const get = await fetch(`${baseUrl}/api/state`, { headers: { Authorization: 'Bearer secret' } });
    const payload = await get.json();
    assert.deepEqual(payload.state.bali_food_v2, [{ id: 'FOOD-1' }]);
    assert.equal(payload.state.forbidden, undefined);
  });
});

test('WeatherService normalizza Open-Meteo e usa la cache in caso di errore', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'bali-weather-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  let fail = false;
  const fetchImpl = async () => {
    if (fail) throw new Error('offline');
    return new Response(JSON.stringify({
      current: { time: '2026-08-01T20:00', temperature_2m: 28, relative_humidity_2m: 75, apparent_temperature: 30, precipitation: 0, weather_code: 2, wind_speed_10m: 8 },
      daily: { temperature_2m_min: [23], temperature_2m_max: [30], precipitation_probability_max: [20], weather_code: [2] }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const service = new WeatherService({ fetchImpl, cacheFile: path.join(directory, 'weather.json'), ttlMs: 1 });
  const live = await service.getWeather({ force: true });
  assert.equal(live.locations.length, 3);
  assert.equal(live.locations[0].description, 'Parzialmente nuvoloso');
  fail = true;
  const cached = await service.getWeather({ force: true });
  assert.equal(cached.stale, true);
  assert.equal(cached.locations[0].temperatureC, 28);
});
