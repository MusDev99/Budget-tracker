import assert from 'node:assert/strict';
import { test } from 'node:test';

import { filterTransactions, groupByDay, selectBudgetStatus, selectMonthStats, selectTodayStats } from '../src/js/core/selectors.js';

const now = new Date(2026, 9, 25, 12, 0); // 25 Oct 2026
const tx = (id, date, total, extra = {}) => ({ id, name: id, price: total, qty: 1, total, category: 'food', ts: Date.parse(date), date, ...extra });

const data = [
  tx('a', '2026-10-25', 10.5),
  tx('b', '2026-10-25', 4.25, { category: 'transport', name: 'Grab ride' }),
  tx('c', '2026-10-01', 20),
  tx('d', '2026-09-30', 99),
];

test('selectTodayStats counts only today', () => {
  assert.deepEqual(selectTodayStats(data, now), { count: 2, total: 14.75 });
});

test('selectMonthStats sums current month and averages per elapsed day', () => {
  assert.deepEqual(selectMonthStats(data, now), { total: 34.75, dailyAverage: 1.39 });
});

test('selectBudgetStatus thresholds: <80 ok, 80-100 warning, >100 over', () => {
  assert.equal(selectBudgetStatus(79, 100).level, 'ok');
  assert.equal(selectBudgetStatus(80, 100).level, 'warning');
  assert.equal(selectBudgetStatus(100, 100).level, 'warning');
  assert.equal(selectBudgetStatus(100.01, 100).level, 'over');
  assert.equal(selectBudgetStatus(120, 100).remaining, -20);
});

test('filterTransactions matches name or category label, newest first', () => {
  assert.deepEqual(filterTransactions(data, { query: 'grab' }).map((t) => t.id), ['b']);
  assert.deepEqual(filterTransactions(data, { query: 'transport' }).map((t) => t.id), ['b']);
  assert.deepEqual(filterTransactions(data, { category: 'food' }).map((t) => t.id), ['a', 'c', 'd']);
});

test('groupByDay keeps order and totals each day', () => {
  const groups = groupByDay(filterTransactions(data));
  assert.deepEqual(groups.map((g) => [g.date, g.total]), [['2026-10-25', 14.75], ['2026-10-01', 20], ['2026-09-30', 99]]);
});
