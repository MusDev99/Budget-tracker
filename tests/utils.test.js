import assert from 'node:assert/strict';
import { test } from 'node:test';

import { sanitizeTransaction } from '../src/js/core/store.js';
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

test('sanitizeTransaction rejects garbage and recomputes total', () => {
  assert.equal(sanitizeTransaction(null), null);
  assert.equal(sanitizeTransaction({ price: 'abc', qty: 1, ts: 0 }), null);
  const t = sanitizeTransaction({ name: 'Coffee', price: 4.5, qty: 2, total: 999, category: 'nope', ts: Date.now() });
  assert.equal(t.total, 9);
  assert.equal(t.category, 'other');
});
