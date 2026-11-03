import assert from 'node:assert/strict';
import { test } from 'node:test';

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
};
globalThis.window = { addEventListener() {} };

const { CURRENT_SCHEMA_VERSION, migrate, normalizeVersion } = await import('../src/js/core/migrations.js');
const { buildBackup, parseBackup } = await import('../src/js/core/backup.js');
const store = await import('../src/js/core/store.js');

const tx = { id: 'a', name: 'Kopi', price: 3.2, qty: 1, category: 'food', ts: Date.parse('2026-10-01T08:00:00'), date: '2026-10-01' };

test('normalizeVersion treats missing or bad values as version 1', () => {
  for (const bad of [undefined, null, 'x', 0, -2, 1.5]) assert.equal(normalizeVersion(bad), 1);
  assert.equal(normalizeVersion(3), 3);
});

test('migrate runs each step in order and reports the final version', () => {
  const migrations = [
    { from: 1, up: (d) => ({ ...d, trail: [...(d.trail ?? []), '1→2'] }) },
    { from: 2, up: (d) => ({ ...d, trail: [...d.trail, '2→3'] }) },
  ];
  const out = migrate({}, 1, { migrations, target: 3 });
  assert.deepEqual([out.ok, out.version, out.data.trail], [true, 3, ['1→2', '2→3']]);
});

test('migrate refuses newer data and survives a throwing or missing step', () => {
  assert.deepEqual(migrate({}, 9, { target: 2 }), { ok: false, reason: 'newer' });
  assert.equal(migrate({}, 1, { migrations: [], target: 2 }).reason, 'failed');
  assert.equal(migrate({}, 1, { migrations: [{ from: 1, up: () => { throw new Error('boom'); } }], target: 2 }).reason, 'failed');
});

test('backup round-trips transactions and settings', () => {
  const settings = { currency: 'USD', dailyBudget: 40, soundOn: false, plan: { salary: 3000, commitments: [{ id: 'c1', label: 'Rent', amount: 1000 }] }, paid: { '2026-10': ['c1'] } };
  const parsed = parseBackup(buildBackup({ transactions: [tx], settings }, new Date('2026-11-03T00:00:00Z')));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.exportedAt, '2026-11-03T00:00:00.000Z');
  assert.equal(parsed.transactions[0].total, 3.2);
  assert.deepEqual(parsed.settings, settings);
  assert.equal(JSON.parse(buildBackup({ transactions: [], settings })).schemaVersion, CURRENT_SCHEMA_VERSION);
});

test('parseBackup rejects junk, other apps and newer backups with a message', () => {
  const bad = (text) => parseBackup(text);
  assert.equal(bad('not json').ok, false);
  assert.equal(bad('null').ok, false);
  assert.equal(bad(JSON.stringify({ app: 'Other', transactions: [] })).ok, false);
  assert.equal(bad(JSON.stringify({ app: 'BudgetCare' })).ok, false);
  const newer = bad(JSON.stringify({ app: 'BudgetCare', schemaVersion: CURRENT_SCHEMA_VERSION + 1, transactions: [] }));
  assert.match(newer.message, /newer/);
  assert.equal(bad(undefined).ok, false);
});

test('parseBackup sanitizes entries, drops unreadable ones and duplicate ids', () => {
  const text = JSON.stringify({
    app: 'BudgetCare',
    schemaVersion: 1,
    transactions: [tx, { ...tx, name: 'dupe' }, { id: 'bad', price: 'abc' }, null, { ...tx, id: 'b', category: '<script>', name: 'x'.repeat(500) }],
    settings: { currency: 'EUR', dailyBudget: -5 },
  });
  const parsed = parseBackup(text);
  assert.equal(parsed.transactions.length, 2);
  assert.equal(parsed.skipped, 3);
  assert.equal(parsed.transactions[1].category, 'other');
  assert.equal(parsed.transactions[1].name.length, 80);
  assert.deepEqual([parsed.settings.currency, parsed.settings.dailyBudget], ['MYR', 0]);
});

test('initStore stamps the schema version on data saved before versioning', () => {
  memory.set('dbt.transactions.v1', JSON.stringify([tx]));
  memory.delete('dbt.schemaVersion');
  store.initStore();
  assert.equal(store.getState().transactions.length, 1);
  assert.equal(memory.get('dbt.schemaVersion'), String(CURRENT_SCHEMA_VERSION));
});

test('initStore leaves data from a newer app untouched on disk', () => {
  memory.set('dbt.transactions.v1', JSON.stringify([tx]));
  memory.set('dbt.schemaVersion', String(CURRENT_SCHEMA_VERSION + 1));
  store.initStore();
  assert.equal(memory.get('dbt.schemaVersion'), String(CURRENT_SCHEMA_VERSION + 1));
});

test('restoreData replaces state, persists it and notifies', () => {
  let notified = 0;
  const off = store.subscribe(() => notified++);
  const parsed = parseBackup(buildBackup({ transactions: [{ ...tx, id: 'r1' }], settings: { currency: 'USD' } }));
  assert.deepEqual(store.restoreData(parsed), { transactions: 1 });
  off();
  assert.equal(notified, 1);
  assert.deepEqual(store.getState().transactions.map((t) => t.id), ['r1']);
  assert.equal(JSON.parse(memory.get('dbt.transactions.v1'))[0].id, 'r1');
  assert.equal(JSON.parse(memory.get('dbt.settings.v1')).currency, 'USD');
  assert.equal(memory.get('dbt.schemaVersion'), String(CURRENT_SCHEMA_VERSION));
});
