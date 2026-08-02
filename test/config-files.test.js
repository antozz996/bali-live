'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root=path.resolve(__dirname,'..');

test('manifest e configurazione Vercel sono JSON validi', () => {
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
  const vercel=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
  assert.ok(manifest.shortcuts.some(item=>item.url.includes('view=travel')));
  assert.ok(vercel.headers[0].headers.some(item=>item.key==='Content-Security-Policy'));
});

test('asset PWA principali sono locali e inclusi nella cache', () => {
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  assert.doesNotMatch(html,/fonts\.googleapis|cdnjs\.cloudflare/);
  for(const asset of ['features.js','vault.js','privacy.html']){
    assert.ok(fs.existsSync(path.join(root,asset)));
    assert.match(worker,new RegExp(asset.replace('.','\\.')));
  }
});

test('login Google non richiede accesso alla casella email', () => {
  const features=fs.readFileSync(path.join(root,'features.js'),'utf8');
  const vercel=fs.readFileSync(path.join(root,'vercel.json'),'utf8');
  assert.doesNotMatch(features,/gmail\.readonly|gmail\.googleapis\.com|scanGmailConfirmations|gmailFetch/);
  assert.doesNotMatch(vercel,/gmail\.googleapis\.com/);
  assert.match(features,/openid email profile/);
  assert.match(features,/include_granted_scopes:false/);
  assert.match(features,/handleConfirmationFile/);
});
