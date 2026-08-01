'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadData() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${fs.readFileSync('data.js', 'utf8')}\n;globalThis.trip=BALI_TRIP_DATA;`, context);
  return context.trip;
}

test('dati principali hanno identificatori univoci e riferimenti validi', () => {
  const data = loadData();
  for (const collection of [data.budgetItems, data.accommodations, data.foodHighlights, data.excursions]) {
    const ids = collection.map(item => item.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every(Boolean));
  }
  const dayNumbers = new Set(data.itinerary.map(day => day.dayNum));
  assert.ok(data.excursions.every(excursion => dayNumbers.has(excursion.dayNum)));
});

test('totali economici dichiarati sono coerenti', () => {
  const data = loadData();
  const paid = data.budgetItems.filter(item => item.paidDefault).reduce((sum, item) => sum + item.amount, 0);
  assert.equal(Number(paid.toFixed(2)), data.meta.budgetPaid);
  assert.ok(data.meta.budgetMax >= data.budgetItems.reduce((sum, item) => sum + item.amount, 0));
});
