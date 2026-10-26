import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computePlan, sanitizePlan, validatePlan } from '../src/js/core/plan.js';
import { selectDailyLimit } from '../src/js/core/selectors.js';

const plan = {
  salary: 5000,
  commitments: [
    { label: 'Car finance', amount: 1200 },
    { label: 'House', amount: 1500 },
    { label: 'Bills', amount: 500 },
  ],
};
const tx = (date, total) => ({ date, total });
const oct26 = new Date(2026, 9, 26, 12); // 31-day month → 6 days left including today

test('flexible balance = salary − commitments', () => {
  const r = computePlan(plan, [], oct26);
  assert.deepEqual([r.committed, r.flexible], [3200, 1800]);
  assert.equal(Math.round(r.committedPercent), 64);
});

test('daily limit spreads the remaining flexible balance over days left (today included)', () => {
  // 1500 spent on earlier days → 300 left ÷ 6 days = 50/day
  const r = computePlan(plan, [tx('2026-10-10', 900), tx('2026-10-25', 600)], oct26);
  assert.equal(r.daysLeft, 6);
  assert.equal(r.dailyLimit, 50);
});

test("today's own spending does not move today's limit", () => {
  const before = computePlan(plan, [tx('2026-10-10', 1500)], oct26).dailyLimit;
  const after = computePlan(plan, [tx('2026-10-10', 1500), tx('2026-10-26', 40)], oct26);
  assert.equal(after.dailyLimit, before);
  assert.equal(after.spentToday, 40);
  assert.equal(after.remainingFlexible, 260);
});

test('previous months are ignored', () => {
  assert.equal(computePlan(plan, [tx('2026-09-30', 9999)], oct26).spentMonth, 0);
});

test('limit rounds down to the cent and never goes negative', () => {
  assert.equal(computePlan({ salary: 100, commitments: [] }, [], new Date(2026, 9, 1)).dailyLimit, 3.22); // 100/31
  const overspent = computePlan(plan, [tx('2026-10-05', 2500)], oct26);
  assert.equal(overspent.dailyLimit, 0);
  assert.equal(overspent.health, 'over');
});

test('commitments above salary → no flexible money', () => {
  const r = computePlan({ salary: 1000, commitments: [{ label: 'x', amount: 1500 }] }, [], oct26);
  assert.deepEqual([r.flexible, r.dailyLimit, r.health], [-500, 0, 'over']);
});

test('health is "tight" when commitments take 70%+ of salary', () => {
  assert.equal(computePlan({ salary: 1000, commitments: [{ label: 'x', amount: 700 }] }, [], oct26).health, 'tight');
  assert.equal(computePlan(plan, [], oct26).health, 'ok');
});

test('last day of the month: all that is left can be spent today', () => {
  const r = computePlan({ salary: 1000, commitments: [] }, [tx('2026-10-20', 900)], new Date(2026, 9, 31));
  assert.deepEqual([r.daysLeft, r.dailyLimit], [1, 100]);
});

test('validatePlan: rows, defaults, clearing, errors', () => {
  const ok = validatePlan({ salary: '5000', rows: [{ label: 'Car', amount: '1200' }, { label: '', amount: '' }, { label: '', amount: '300' }] });
  assert.deepEqual(ok.plan, { salary: 5000, commitments: [{ label: 'Car', amount: 1200 }, { label: 'Commitment 2', amount: 300 }] });
  assert.deepEqual(validatePlan({ salary: '', rows: [] }), { ok: true, plan: null });
  assert.equal(validatePlan({ salary: '', rows: [{ label: 'Car', amount: '1' }] }).field, 'salary');
  assert.equal(validatePlan({ salary: '0', rows: [] }).field, 'salary');
  assert.deepEqual(validatePlan({ salary: '5000', rows: [{ label: 'Car', amount: '' }] }), { ok: false, field: 'commitments', index: 0, message: 'Enter an amount for "Car".' });
});

test('sanitizePlan drops junk and returns null without a salary', () => {
  assert.equal(sanitizePlan(null), null);
  assert.equal(sanitizePlan({ salary: 'abc' }), null);
  assert.deepEqual(sanitizePlan({ salary: 10, commitments: [{ label: 'ok', amount: 1 }, { amount: -1 }, null] }), { salary: 10, commitments: [{ label: 'ok', amount: 1 }] });
});

test('selectDailyLimit: plan beats manual, manual beats nothing', () => {
  assert.equal(selectDailyLimit({ plan, dailyBudget: 99 }, [tx('2026-10-10', 1500)], oct26).source, 'plan');
  assert.deepEqual(selectDailyLimit({ plan: null, dailyBudget: 99 }, [], oct26), { limit: 99, source: 'manual', plan: null });
  assert.equal(selectDailyLimit({ plan: null, dailyBudget: 0 }, [], oct26).source, null);
});
