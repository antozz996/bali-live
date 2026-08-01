'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

class ExchangeService {
  constructor(options = {}) {
    this.fetch = options.fetchImpl || globalThis.fetch;
    this.cacheFile = options.cacheFile || path.join(process.cwd(), '.data', 'exchange-cache.json');
    this.ttlMs = options.ttlMs || 6 * 60 * 60 * 1000;
    this.memoryCache = null;
  }

  isFresh(payload) {
    return payload?.fetchedAt && Date.now() - Date.parse(payload.fetchedAt) < this.ttlMs;
  }

  async getRate({ force = false } = {}) {
    if (!force && this.isFresh(this.memoryCache)) return this.memoryCache;
    if (!force) {
      const cached = await this.readCache();
      if (this.isFresh(cached)) return (this.memoryCache = cached);
    }

    try {
      const response = await this.fetch('https://api.frankfurter.dev/v2/rate/EUR/IDR', {
        headers: { Accept: 'application/json', 'User-Agent': 'BaliLive/3.0' },
        signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) throw new Error(`Frankfurter ha risposto ${response.status}`);
      const data = await response.json();
      const rate = Number(data.rate);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error('Cambio EUR/IDR non valido');
      const payload = {
        base: 'EUR', quote: 'IDR', rate,
        asOf: data.date || new Date().toISOString().slice(0, 10),
        fetchedAt: new Date().toISOString(), source: 'Frankfurter', stale: false
      };
      this.memoryCache = payload;
      await this.writeCache(payload).catch(() => {});
      return payload;
    } catch (error) {
      const fallback = this.memoryCache || await this.readCache();
      if (fallback) return { ...fallback, stale: true, warning: 'Cambio temporaneamente non aggiornabile' };
      throw error;
    }
  }

  async readCache() {
    try { return JSON.parse(await fs.readFile(this.cacheFile, 'utf8')); }
    catch (error) {
      if (error.code === 'ENOENT' || error instanceof SyntaxError) return null;
      throw error;
    }
  }

  async writeCache(payload) {
    await fs.mkdir(path.dirname(this.cacheFile), { recursive: true });
    await fs.writeFile(this.cacheFile, JSON.stringify(payload, null, 2), { mode: 0o600 });
  }
}

module.exports = { ExchangeService };
