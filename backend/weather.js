'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const WEATHER_LOCATIONS = Object.freeze([
  { id: 'ubud', name: 'Ubud', latitude: -8.5069, longitude: 115.2625 },
  { id: 'gili-air', name: 'Gili Air', latitude: -8.3573, longitude: 116.0827 },
  { id: 'uluwatu', name: 'Uluwatu', latitude: -8.8291, longitude: 115.0849 }
]);

const WEATHER_CODES = Object.freeze({
  0: ['Sereno', '☀️'],
  1: ['Prevalentemente sereno', '🌤️'],
  2: ['Parzialmente nuvoloso', '⛅'],
  3: ['Coperto', '☁️'],
  45: ['Nebbia', '🌫️'],
  48: ['Nebbia con brina', '🌫️'],
  51: ['Pioviggine leggera', '🌦️'],
  53: ['Pioviggine', '🌦️'],
  55: ['Pioviggine intensa', '🌧️'],
  61: ['Pioggia leggera', '🌦️'],
  63: ['Pioggia', '🌧️'],
  65: ['Pioggia intensa', '🌧️'],
  80: ['Rovesci leggeri', '🌦️'],
  81: ['Rovesci', '🌧️'],
  82: ['Rovesci forti', '⛈️'],
  95: ['Temporale', '⛈️'],
  96: ['Temporale con grandine', '⛈️'],
  99: ['Temporale forte con grandine', '⛈️']
});

function describeWeather(code) {
  const [description, icon] = WEATHER_CODES[code] || ['Condizioni variabili', '🌤️'];
  return { description, icon };
}

class WeatherService {
  constructor(options = {}) {
    this.fetch = options.fetchImpl || globalThis.fetch;
    this.cacheFile = options.cacheFile || path.join(process.cwd(), '.data', 'weather-cache.json');
    this.ttlMs = options.ttlMs || 10 * 60 * 1000;
    this.memoryCache = null;
  }

  isFresh(payload) {
    return payload?.fetchedAt && Date.now() - Date.parse(payload.fetchedAt) < this.ttlMs;
  }

  async getWeather({ force = false } = {}) {
    if (!force && this.isFresh(this.memoryCache)) return this.memoryCache;

    if (!force) {
      const diskCache = await this.readCache();
      if (this.isFresh(diskCache)) {
        this.memoryCache = diskCache;
        return diskCache;
      }
    }

    try {
      const locations = await Promise.all(WEATHER_LOCATIONS.map(location => this.fetchLocation(location)));
      const payload = {
        source: 'Open-Meteo',
        fetchedAt: new Date().toISOString(),
        stale: false,
        locations
      };
      this.memoryCache = payload;
      await this.writeCache(payload);
      return payload;
    } catch (error) {
      const fallback = this.memoryCache || await this.readCache();
      if (fallback) return { ...fallback, stale: true, warning: 'Dati meteo temporaneamente non aggiornabili' };
      throw error;
    }
  }

  async fetchLocation(location) {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
      timezone: 'Asia/Makassar',
      forecast_days: '1'
    }).toString();

    const response = await this.fetch(url, {
      headers: { 'User-Agent': 'BaliLive/2.0 (+https://github.com/antozz996/bali-live)' },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`Open-Meteo ha risposto ${response.status}`);
    const data = await response.json();
    const currentDescription = describeWeather(data.current?.weather_code);

    return {
      id: location.id,
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      observedAt: data.current?.time,
      temperatureC: data.current?.temperature_2m,
      apparentTemperatureC: data.current?.apparent_temperature,
      humidityPercent: data.current?.relative_humidity_2m,
      precipitationMm: data.current?.precipitation,
      windSpeedKmh: data.current?.wind_speed_10m,
      weatherCode: data.current?.weather_code,
      description: currentDescription.description,
      icon: currentDescription.icon,
      today: {
        minTemperatureC: data.daily?.temperature_2m_min?.[0],
        maxTemperatureC: data.daily?.temperature_2m_max?.[0],
        precipitationProbabilityPercent: data.daily?.precipitation_probability_max?.[0]
      }
    };
  }

  async readCache() {
    try {
      return JSON.parse(await fs.readFile(this.cacheFile, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT' || error instanceof SyntaxError) return null;
      throw error;
    }
  }

  async writeCache(payload) {
    await fs.mkdir(path.dirname(this.cacheFile), { recursive: true });
    await fs.writeFile(this.cacheFile, JSON.stringify(payload, null, 2), { mode: 0o600 });
  }
}

module.exports = { WeatherService, WEATHER_LOCATIONS, describeWeather };
