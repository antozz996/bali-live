'use strict';

module.exports = function healthHandler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Metodo non consentito' });
  }

  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  return response.status(200).json({
    status: 'ok',
    service: 'bali-live-vercel',
    stateSyncEnabled: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL),
    gmailEnabled: Boolean(process.env.GOOGLE_CLIENT_ID)
  });
};
