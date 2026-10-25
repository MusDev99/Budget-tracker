/**
 * Pure, side-effect-free derivations from store state. Easy to unit test.
 */
import { BUDGET_THRESHOLDS, CATEGORY_MAP } from '../config/constants.js';
import { toDateKey, toMonthKey } from '../utils/date.js';
import { round2, sumBy } from '../utils/number.js';

export function selectTodayStats(transactions, now = new Date()) {
  const key = toDateKey(now);
  const items = transactions.filter((t) => t.date === key);
  return { count: items.length, total: sumBy(items, 'total') };
}

export function selectMonthStats(transactions, now = new Date()) {
  const key = toMonthKey(now);
  const total = sumBy(transactions.filter((t) => t.date.startsWith(key)), 'total');
  return { total, dailyAverage: round2(total / now.getDate()) };
}

/** Month spend per category, largest first; categories with no spend are omitted. */
export function selectCategoryBreakdown(transactions, now = new Date()) {
  const key = toMonthKey(now);
  const totals = new Map();
  for (const t of transactions) {
    if (t.date.startsWith(key)) totals.set(t.category, (totals.get(t.category) ?? 0) + t.total);
  }
  const grand = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals]
    .map(([category, total]) => ({ category, total: round2(total), percent: grand ? (total / grand) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);
}

/** @returns {'ok' | 'warning' | 'over'} */
export function selectBudgetStatus(spent, budget) {
  const percent = budget > 0 ? (spent / budget) * 100 : 0;
  const level = percent > BUDGET_THRESHOLDS.over ? 'over' : percent >= BUDGET_THRESHOLDS.warning ? 'warning' : 'ok';
  return { percent, level, remaining: round2(budget - spent) };
}

/** Filter by category + free-text (matches item name or category label), newest first. */
export function filterTransactions(transactions, { query = '', category = 'all' } = {}) {
  const q = query.trim().toLowerCase();
  return transactions
    .filter((t) => category === 'all' || t.category === category)
    .filter((t) => !q || t.name.toLowerCase().includes(q) || CATEGORY_MAP[t.category].label.toLowerCase().includes(q))
    .sort((a, b) => b.ts - a.ts);
}

/** Group an already-sorted list by date key, preserving order. */
export function groupByDay(transactions) {
  const groups = new Map();
  for (const t of transactions) {
    if (!groups.has(t.date)) groups.set(t.date, []);
    groups.get(t.date).push(t);
  }
  return [...groups].map(([date, items]) => ({ date, items, total: sumBy(items, 'total') }));
}
