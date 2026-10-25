import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseQuantity, previewTotal, validateExpense } from '../src/js/core/validation.js';
import { toDateKey } from '../src/js/utils/date.js';

test('parseQuantity: empty means 1, garbage is NaN', () => {
  assert.equal(parseQuantity(''), 1);
  assert.equal(parseQuantity('  '), 1);
  assert.equal(parseQuantity('2.5'), 2.5);
  assert.ok(Number.isNaN(parseQuantity('abc')));
});

test('previewTotal multiplies and previews invalid input as 0', () => {
  assert.equal(previewTotal('4.50', '2'), 9);
  assert.equal(previewTotal('0.1', '3'), 0.3);
  assert.equal(previewTotal('', ''), 0);
  assert.equal(previewTotal('x', '2'), 0);
});

test('validateExpense reports the first invalid field', () => {
  assert.deepEqual(validateExpense({ name: ' ', price: '1', qty: '' }), { ok: false, field: 'name', message: 'Please enter an item name.' });
  assert.equal(validateExpense({ name: 'Kopi', price: '', qty: '' }).field, 'price');
  assert.equal(validateExpense({ name: 'Kopi', price: '-1', qty: '' }).field, 'price');
  assert.equal(validateExpense({ name: 'Kopi', price: '2', qty: '0' }).field, 'qty');
});

test('validateExpense trims, defaults qty and only returns date when given', () => {
  assert.deepEqual(validateExpense({ name: '  Nasi Lemak ', price: '4.50', qty: '' }), {
    ok: true,
    values: { name: 'Nasi Lemak', price: 4.5, qty: 1 },
  });
  const today = toDateKey();
  assert.equal(validateExpense({ name: 'a', price: '1', qty: '', date: today }).values.date, today);
});

test('validateExpense rejects missing or future dates', () => {
  assert.equal(validateExpense({ name: 'a', price: '1', qty: '', date: '' }).field, 'date');
  assert.equal(validateExpense({ name: 'a', price: '1', qty: '', date: '2999-01-01' }).message, "Date can't be in the future.");
});
