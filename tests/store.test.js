import assert from 'node:assert/strict';
import { test } from 'node:test';

// Minimal in-memory localStorage so store actions persist exactly as in the browser.
const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
};
const savedTransactions = () => JSON.parse(memory.get('dbt.transactions.v1') ?? '[]');

const store = await import('../src/js/core/store.js');

test('updateTransaction edits fields, recomputes total and keeps the id', () => {
  const tx = store.addTransaction({ name: 'Kopi', price: 3.2, qty: 1, category: 'food' });
  const updated = store.updateTransaction(tx.id, { name: 'Kopi O', price: 2.8, qty: 2, category: 'other' });
  assert.equal(updated.id, tx.id);
  assert.equal(updated.name, 'Kopi O');
  assert.equal(updated.total, 5.6);
  assert.equal(updated.category, 'other');
  assert.equal(store.getState().transactions.find((t) => t.id === tx.id).total, 5.6);
  assert.equal(savedTransactions().find((t) => t.id === tx.id).name, 'Kopi O', 'edit is persisted');
});

test('updateTransaction moving the date keeps the time of day', () => {
  const tx = store.addTransaction({ name: 'Grab', price: 12, qty: 1, category: 'transport' });
  const updated = store.updateTransaction(tx.id, { date: '2026-01-15' });
  const before = new Date(tx.ts);
  const after = new Date(updated.ts);
  assert.equal(updated.date, '2026-01-15');
  assert.deepEqual([after.getFullYear(), after.getMonth(), after.getDate()], [2026, 0, 15]);
  assert.deepEqual([after.getHours(), after.getMinutes()], [before.getHours(), before.getMinutes()]);
});

test('updateTransaction returns null for an unknown id', () => {
  assert.equal(store.updateTransaction('nope', { name: 'x' }), null);
});

test('deleteTransaction removes and returns the transaction', () => {
  const tx = store.addTransaction({ name: 'Milk', price: 6, qty: 1, category: 'groceries' });
  assert.equal(store.deleteTransaction(tx.id).id, tx.id);
  assert.equal(store.getState().transactions.some((t) => t.id === tx.id), false);
});
