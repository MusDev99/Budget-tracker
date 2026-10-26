import assert from 'node:assert/strict';
import { test } from 'node:test';

import { sanitizeSettings, sanitizeTransaction } from '../src/js/core/store.js';
import { toCsv, toCsvCell } from '../src/js/utils/csv.js';
import { formatMoney, round2 } from '../src/js/utils/number.js';

test('round2 avoids float drift', () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(0.1 + 0.2), 0.3);
});

test('formatMoney uses symbol and two decimals', () => {
  assert.equal(formatMoney(1234.5, { symbol: 'RM' }), 'RM 1,234.50');
});

test('toCsvCell quotes and blocks formula injection', () => {
  assert.equal(toCsvCell('a,b'), '"a,b"');
  assert.equal(toCsvCell('say "hi"'), '"say ""hi"""');
  assert.equal(toCsvCell('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(toCsv([['x', 1], ['y', 2]]), 'x,1\r\ny,2');
});

test('sound setting defaults on and only an explicit false mutes', () => {
  assert.equal(sanitizeSettings({}).soundOn, true);
  assert.equal(sanitizeSettings(null).soundOn, true);
  assert.equal(sanitizeSettings({ soundOn: 'yes' }).soundOn, true);
  assert.equal(sanitizeSettings({ soundOn: false }).soundOn, false);
});

test('sanitizeTransaction rejects garbage and recomputes total', () => {
  assert.equal(sanitizeTransaction(null), null);
  assert.equal(sanitizeTransaction({ price: 'abc', qty: 1, ts: 0 }), null);
  const t = sanitizeTransaction({ name: 'Coffee', price: 4.5, qty: 2, total: 999, category: 'nope', ts: Date.now() });
  assert.equal(t.total, 9);
  assert.equal(t.category, 'other');
});

test('CSV export adds a Breakdown column', async () => {
  const { buildTransactionsCsv } = await import('../src/js/services/export.js');
  const csv = buildTransactionsCsv(
    [{ date: '2026-10-26', ts: Date.parse('2026-10-26T12:30:00'), name: 'Gordon Steak', category: 'food', price: 50, qty: 1, total: 50,
       items: [{ label: 'Steak', amount: 30 }, { label: 'Drink', amount: 20 }] }],
    { code: 'MYR' },
  );
  const [header, row] = csv.replace('﻿', '').split('\r\n');
  assert.ok(header.endsWith(',Breakdown'));
  assert.ok(row.endsWith(',Steak 30.00; Drink 20.00'));
});
