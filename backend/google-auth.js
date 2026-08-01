'use strict';

async function verifyGoogleAccessToken(token, fetchImpl = globalThis.fetch) {
  if (!token || token.length < 20) {
    const error = new Error('Token Google mancante');
    error.statusCode = 401;
    throw error;
  }
  const response = await fetchImpl('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) {
    const error = new Error('Sessione Google non valida o scaduta');
    error.statusCode = 401;
    throw error;
  }
  const profile = await response.json();
  if (!profile.sub || !profile.email || profile.email_verified === false) {
    const error = new Error('Profilo Google non verificato');
    error.statusCode = 403;
    throw error;
  }
  return { sub: String(profile.sub), email: String(profile.email), name: String(profile.name || '') };
}

module.exports = { verifyGoogleAccessToken };
