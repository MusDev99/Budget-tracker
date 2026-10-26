import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseQuantity, previewTotal, validateExpense, validateItems } from '../src/js/core/validation.js';
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
    values: { name: 'Nasi Lemak', price: 4.5, qty: 1, items: [] },
  });
  const today = toDateKey();
  assert.equal(validateExpense({ name: 'a', price: '1', qty: '', date: today }).values.date, today);
});

test('validateExpense rejects missing or future dates', () => {
  assert.equal(validateExpense({ name: 'a', price: '1', qty: '', date: '' }).field, 'date');
  assert.equal(validateExpense({ name: 'a', price: '1', qty: '', date: '2999-01-01' }).message, "Date can't be in the future.");
});

test('breakdown: receipt lines sum to the price, qty forced to 1', () => {
  const result = validateExpense({
    name: 'Gordon Steak Restaurant',
    price: '',
    qty: '3',
    items: [
      { label: 'Steak', amount: '30' },
      { label: 'Drink', amount: '10' },
      { label: '', amount: '' }, // blank rows are ignored
      { label: 'Dessert', amount: '10.00' },
    ],
  });
  assert.equal(result.ok, true);
  assert.equal(result.values.price, 50);
  assert.equal(result.values.qty, 1);
  assert.deepEqual(result.values.items.map((i) => i.label), ['Steak', 'Drink', 'Dessert']);
});

test('breakdown: float-safe sum and default labels', () => {
  const { items } = validateItems([{ label: '', amount: '0.1' }, { label: '', amount: '0.2' }]);
  assert.deepEqual(items.map((i) => i.label), ['Item 1', 'Item 2']);
  assert.equal(validateExpense({ name: 'x', items: [{ label: '', amount: '0.1' }, { label: '', amount: '0.2' }] }).values.price, 0.3);
});

test('breakdown: errors point at the offending row', () => {
  assert.deepEqual(validateItems([{ label: 'Steak', amount: '30' }, { label: 'Drink', amount: '' }]), {
    ok: false,
    index: 1,
    message: 'Enter an amount for "Drink".',
  });
  assert.equal(validateItems([{ label: '', amount: '-5' }]).message, 'Amount for item 1 must be more than 0.');
  assert.equal(validateItems([{ label: '', amount: '' }]).message, 'Add at least one item to the breakdown.');
  assert.equal(validateExpense({ name: 'x', items: [] }).field, 'items');
});
