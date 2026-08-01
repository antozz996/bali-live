'use strict';

const path = require('node:path');
const { ExchangeService } = require('../backend/exchange');

const service = new ExchangeService({ cacheFile: path.join('/tmp', 'bali-live-exchange-cache.json') });

function createExchangeHandler(exchangeService = service) {
  return async function exchangeHandler(request, response) {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return response.status(405).json({ error: 'Metodo non consentito' });
    }
    try {
      const payload = await exchangeService.getRate({ force: request.query?.refresh === '1' });
      response.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
      return response.status(200).json(payload);
    } catch (error) {
      console.error('Vercel exchange function:', error);
      return response.status(502).json({ error: 'Cambio temporaneamente non disponibile' });
    }
  };
}

module.exports = createExchangeHandler();
module.exports.createExchangeHandler = createExchangeHandler;
