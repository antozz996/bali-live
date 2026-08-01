'use strict';

class CloudStateStore {
  constructor(pool) {
    this.pool = pool;
    this.ready = null;
  }

  async ensureSchema() {
    if (!this.ready) {
      this.ready = this.pool.query(`
        CREATE TABLE IF NOT EXISTS bali_user_state (
          user_sub TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          state JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `).catch(error => { this.ready = null; throw error; });
    }
    await this.ready;
  }

  async read(user) {
    await this.ensureSchema();
    const result = await this.pool.query(
      'SELECT state, updated_at FROM bali_user_state WHERE user_sub = $1',
      [user.sub]
    );
    const row = result.rows[0];
    return { version: 1, updatedAt: row?.updated_at?.toISOString?.() || row?.updated_at || null, state: row?.state || {} };
  }

  async write(user, state) {
    await this.ensureSchema();
    const result = await this.pool.query(`
      INSERT INTO bali_user_state (user_sub, email, state, updated_at)
      VALUES ($1, $2, $3::jsonb, NOW())
      ON CONFLICT (user_sub) DO UPDATE
      SET email = EXCLUDED.email, state = EXCLUDED.state, updated_at = NOW()
      RETURNING state, updated_at
    `, [user.sub, user.email, JSON.stringify(state)]);
    const row = result.rows[0];
    return { version: 1, updatedAt: row.updated_at?.toISOString?.() || row.updated_at, state: row.state };
  }
}

function createCloudPool(databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL) {
  if (!databaseUrl) return null;
  const { Pool } = require('pg');
  return new Pool({ connectionString: databaseUrl, max: 2, idleTimeoutMillis: 10000 });
}

module.exports = { CloudStateStore, createCloudPool };
