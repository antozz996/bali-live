'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { extractBookingFromText, italianToIso, normalizeBooking } = require('../features');
const { encryptBytes, decryptBytes } = require('../vault');

test('parser conferme riconosce volo, codice, data e importo', () => {
  const booking=extractBookingFromText('Conferma PNR: ABC12D partenza 15/09/2026 totale EUR 1.929,36',{subject:'Emirates flight confirmation',from:'Emirates'});
  assert.equal(booking.type,'Volo');assert.equal(booking.code,'ABC12D');assert.equal(booking.startDate,'2026-09-15');assert.equal(booking.amountEUR,1929.36);
});

test('parser conferme gestisce date e importi in formato inglese', () => {
  const booking=extractBookingFromText('Reservation reference ZX90YY. Check-in September 20, 2026. Total EUR 1,929.36',{subject:'Booking.com hotel reservation',from:'Booking.com'});
  assert.equal(booking.type,'Hotel');assert.equal(booking.startDate,'2026-09-20');assert.equal(booking.amountEUR,1929.36);
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
