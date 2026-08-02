'use strict';

module.exports = function configHandler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Metodo non consentito' });
  }
  response.setHeader('Cache-Control', 'public, s-maxage=300');
  return response.status(200).json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleLoginEnabled: Boolean(process.env.GOOGLE_CLIENT_ID),
    cloudSyncEnabled: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL)
  });
};
