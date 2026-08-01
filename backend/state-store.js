'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const STATE_VERSION = 1;

class StateStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.writeQueue = Promise.resolve();
  }

  async read() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || typeof parsed.state !== 'object') {
        throw new Error('Formato stato non valido');
      }
      return parsed;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { version: STATE_VERSION, updatedAt: null, state: {} };
      }
      throw error;
    }
  }

  async write(state) {
    const snapshot = {
      version: STATE_VERSION,
      updatedAt: new Date().toISOString(),
      state
    };

    this.writeQueue = this.writeQueue.then(async () => {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
      await fs.writeFile(temporaryPath, JSON.stringify(snapshot, null, 2), { mode: 0o600 });
      await fs.rename(temporaryPath, this.filePath);
    });

    await this.writeQueue;
    return snapshot;
  }
}

module.exports = { StateStore, STATE_VERSION };
