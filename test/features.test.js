'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { extractBookingFromText, isTravelConfirmation, parseEml, italianToIso, normalizeBooking } = require('../features');
const { encryptBytes, decryptBytes } = require('../vault');

test('parser conferme riconosce volo, codice, data e importo', () => {
  const booking=extractBookingFromText('Conferma PNR: ABC12D partenza 15/09/2026 totale EUR 1.929,36',{subject:'Emirates flight confirmation',from:'Emirates'});
  assert.equal(booking.type,'Volo');assert.equal(booking.code,'ABC12D');assert.equal(booking.startDate,'2026-09-15');assert.equal(booking.amountEUR,1929.36);
});

test('parser conferme gestisce date e importi in formato inglese', () => {
  const booking=extractBookingFromText('Reservation reference ZX90YY. Check-in September 20, 2026. Total EUR 1,929.36',{subject:'Booking.com hotel reservation',from:'Booking.com'});
  assert.equal(booking.type,'Hotel');assert.equal(booking.startDate,'2026-09-20');assert.equal(booking.amountEUR,1929.36);
});

test('parser EML legge solo il messaggio scelto e decodifica un multipart base64', () => {
  const body=Buffer.from('Reservation reference ZX90YY. Check-in September 20, 2026. Total EUR 1,929.36.','utf8').toString('base64');
  const eml=[
    'From: Booking.com <confirmation@booking.com>',
    'Subject: =?UTF-8?Q?Conferma_prenotazione_Bali?=',
    'Message-ID: <selected-message@example.com>',
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="bali-boundary"',
    '',
    '--bali-boundary',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    body,
    '--bali-boundary--'
  ].join('\r\n');
  const parsed=parseEml(eml);
  assert.equal(parsed.recognized,true);
  assert.equal(parsed.metadata.subject,'Conferma prenotazione Bali');
  assert.equal(parsed.booking.type,'Hotel');
  assert.equal(parsed.booking.code,'ZX90YY');
  assert.equal(parsed.booking.startDate,'2026-09-20');
  assert.equal(parsed.booking.gmailMessageId,'selected-message@example.com');
});

test('newsletter e messaggi non transazionali non vengono proposti per importazione', () => {
  const text='Emirates summer offers: scopri Bali e risparmia EUR 299 sul prossimo volo.';
  assert.equal(isTravelConfirmation(text,{subject:'Idee per la tua estate',from:'Emirates'}),false);
  const parsed=parseEml(`From: Emirates <news@example.com>\nSubject: Offerte estate\nContent-Type: text/plain; charset=utf-8\n\n${text}`);
  assert.equal(parsed.recognized,false);
});

test('normalizzazione prenotazioni rifiuta URL e ID pericolosi', () => {
  const booking=normalizeBooking({id:'"><script>',title:'Test',link:'javascript:alert(1)',amountEUR:-2},0);
  assert.equal(booking.id,'BOOK-1');assert.equal(booking.link,'');assert.equal(booking.amountEUR,0);assert.equal(italianToIso('7/9/2026'),'2026-09-07');
});

test('vault cifra e decifra bytes con AES-GCM', async () => {
  const original=new TextEncoder().encode('voucher segreto Bali');
  const encrypted=await encryptBytes('passphrase-sicura',original);
  assert.notDeepEqual(new Uint8Array(encrypted.encrypted),original);
  const decrypted=await decryptBytes('passphrase-sicura',encrypted);
  assert.equal(new TextDecoder().decode(decrypted),'voucher segreto Bali');
  await assert.rejects(()=>decryptBytes('passphrase-errata',encrypted));
});
