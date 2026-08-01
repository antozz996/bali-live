(function setupBaliVault(global) {
  'use strict';

  const DB_NAME = 'bali-live-vault';
  const STORE_NAME = 'documents';
  const ITERATIONS = 250000;

  function cryptoApi() {
    const value = global.crypto || globalThis.crypto;
    if (!value?.subtle) throw new Error('Web Crypto non disponibile');
    return value;
  }

  async function deriveKey(passphrase, salt) {
    if (String(passphrase || '').length < 8) throw new Error('La passphrase deve contenere almeno 8 caratteri');
    const api = cryptoApi();
    const material = await api.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return api.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptBytes(passphrase, bytes) {
    const api = cryptoApi();
    const salt = api.getRandomValues(new Uint8Array(16));
    const iv = api.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt);
    const encrypted = await api.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
    return { salt, iv, encrypted };
  }

  async function decryptBytes(passphrase, record) {
    const api = cryptoApi();
    const key = await deriveKey(passphrase, new Uint8Array(record.salt));
    return api.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(record.iv) }, key, record.encrypted);
  }

  function openDatabase() {
    if (!global.indexedDB) return Promise.reject(new Error('IndexedDB non disponibile'));
    return new Promise((resolve, reject) => {
      const request = global.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('bookingId', 'bookingId', { unique: false });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function transaction(mode, callback) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      let result;
      try { result = callback(store); } catch (error) { reject(error); return; }
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  async function storeFile(file, passphrase, bookingId = '') {
    if (!file || file.size > 10 * 1024 * 1024) throw new Error('Il documento deve essere inferiore a 10 MB');
    const payload = await encryptBytes(passphrase, await file.arrayBuffer());
    const record = {
      id: `DOC-${Date.now()}-${cryptoApi().getRandomValues(new Uint32Array(1))[0]}`,
      bookingId: String(bookingId || ''), name: String(file.name || 'documento'),
      type: String(file.type || 'application/octet-stream'), size: Number(file.size) || 0,
      createdAt: new Date().toISOString(), salt: payload.salt, iv: payload.iv, encrypted: payload.encrypted
    };
    await transaction('readwrite', store => store.put(record));
    return { ...record, encrypted: undefined, salt: undefined, iv: undefined };
  }

  async function listFiles() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => {
        db.close();
        resolve(request.result.map(({ encrypted, salt, iv, ...metadata }) => metadata).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  }

  async function getFile(id, passphrase) {
    const db = await openDatabase();
    const record = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (!record) throw new Error('Documento non trovato');
    try {
      const bytes = await decryptBytes(passphrase, record);
      return { metadata: record, blob: new Blob([bytes], { type: record.type }) };
    } catch { throw new Error('Passphrase errata o documento danneggiato'); }
  }

  async function deleteFile(id) {
    await transaction('readwrite', store => store.delete(id));
  }

  const api = { deriveKey, encryptBytes, decryptBytes, storeFile, listFiles, getFile, deleteFile };
  global.BaliVault = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
