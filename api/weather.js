'use strict';

const path = require('node:path');
const { WeatherService } = require('../backend/weather');

const weatherService = new WeatherService({
  cacheFile: path.join('/tmp', 'bali-live-weather-cache.json')
});

function createWeatherHandler(service = weatherService) {
  return async function weatherHandler(request, response) {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return response.status(405).json({ error: 'Metodo non consentito' });
    }

    try {
      const force = request.query?.refresh === '1';
      const payload = await service.getWeather({ force });
      response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      return response.status(200).json(payload);
    } catch (error) {
      console.error('Vercel weather function:', error);
      response.setHeader('Cache-Control', 'no-store');
      return response.status(502).json({ error: 'Meteo temporaneamente non disponibile' });
    }
  };
}

module.exports = createWeatherHandler();
module.exports.createWeatherHandler = createWeatherHandler;
