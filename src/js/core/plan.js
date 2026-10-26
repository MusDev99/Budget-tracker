/**
 * Monthly plan: net salary minus fixed commitments (car finance, house, bills) leaves the
 * "flexible" balance for everyday spending. The suggested daily limit spreads what is
 * left of that balance over the days remaining this month.
 *
 * Pure functions only — shared by the store, selectors, UI and tests.
 */
import { MAX_COMMITMENTS, MAX_ITEM_LABEL_LENGTH } from '../config/constants.js';
import { toDateKey, toMonthKey } from '../utils/date.js';
import { createId } from '../utils/id.js';
import { round2 } from '../utils/number.js';

/**
 * @typedef {Object} Commitment
 * @property {string} id      Stable across edits, so "paid" ticks survive renames and amount changes
 * @property {string} label
 * @property {number} amount  Per month, 2dp, > 0
 *
 * @typedef {Object} Plan
 * @property {number} salary  Net monthly salary
 * @property {Commitment[]} commitments
 */

export const sumCommitments = (commitments) => round2(commitments.reduce((sum, c) => sum + c.amount, 0));

/** Coerce stored data into a valid Plan, or null when there is no usable salary. */
export function sanitizePlan(raw) {
  const salary = round2(Number(raw?.salary));
  if (!Number.isFinite(salary) || salary <= 0) return null;
  const commitments = (Array.isArray(raw.commitments) ? raw.commitments : [])
    .map((c) => ({ id: String(c?.id || createId()), label: String(c?.label ?? '').trim().slice(0, MAX_ITEM_LABEL_LENGTH), amount: round2(Number(c?.amount)) }))
    .filter((c) => Number.isFinite(c.amount) && c.amount > 0)
    .slice(0, MAX_COMMITMENTS)
    .map((c, i) => ({ ...c, label: c.label || `Commitment ${i + 1}` }));
  return { salary, commitments };
}

/**
 * Validate the plan form (raw strings straight from the inputs).
 * An empty salary with no commitments means "clear the plan" (`plan: null`).
 * @returns {{ ok: true, plan: Plan | null }
 *         | { ok: false, field: 'salary' | 'commitments', index?: number, message: string }}
 */
export function validatePlan({ salary, rows }) {
  const salaryText = String(salary ?? '').trim();
  const commitments = [];

  for (const [index, row] of rows.entries()) {
    const label = String(row.label ?? '').trim().slice(0, MAX_ITEM_LABEL_LENGTH);
    const amountText = String(row.amount ?? '').trim();
    if (!label && !amountText) continue;

    const amount = Number(amountText);
    const name = label ? `"${label}"` : `commitment ${index + 1}`;
    if (amountText === '' || !Number.isFinite(amount)) return { ok: false, field: 'commitments', index, message: `Enter an amount for ${name}.` };
    if (amount <= 0) return { ok: false, field: 'commitments', index, message: `Amount for ${name} must be more than 0.` };
    commitments.push({ id: String(row.id || createId()), label: label || `Commitment ${commitments.length + 1}`, amount: round2(amount) });
  }

  if (salaryText === '' && commitments.length === 0) return { ok: true, plan: null };

  const salaryValue = Number(salaryText);
  if (salaryText === '' || !Number.isFinite(salaryValue) || salaryValue <= 0) {
    return { ok: false, field: 'salary', message: 'Enter your net monthly salary.' };
  }
  if (commitments.length > MAX_COMMITMENTS) {
    return { ok: false, field: 'commitments', message: `Up to ${MAX_COMMITMENTS} commitments.` };
  }
  return { ok: true, plan: { salary: round2(salaryValue), commitments } };
}

/**
 * Keep only the last few months of "paid" ticks: { 'YYYY-MM': [commitmentId, ...] }.
 * Each month starts with nothing ticked, so there is nothing to re-enter or reset.
 */
export function sanitizePaid(raw) {
  if (!raw || typeof raw !== 'object') return {};
  return Object.fromEntries(
    Object.keys(raw)
      .filter((month) => /^\d{4}-\d{2}$/.test(month) && Array.isArray(raw[month]))
      .sort()
      .slice(-3)
      .map((month) => [month, [...new Set(raw[month].map(String))]]),
  );
}

/** Paid vs still-to-pay commitments for the month of `now`. Unknown ids are ignored. */
export function paidSummary(plan, paid, now = new Date()) {
  const ticked = new Set(paid?.[toMonthKey(now)] ?? []);
  const paidItems = plan.commitments.filter((c) => ticked.has(c.id));
  const paidAmount = sumCommitments(paidItems);
  return {
    paidIds: new Set(paidItems.map((c) => c.id)),
    paidCount: paidItems.length,
    paidAmount,
    unpaidAmount: round2(sumCommitments(plan.commitments) - paidAmount),
    allPaid: plan.commitments.length > 0 && paidItems.length === plan.commitments.length,
  };
}

export const daysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

/**
 * Compute the month's numbers from a plan and the regular expenses so far.
 *
 * dailyLimit is for *today*: (flexible − spent before today) ÷ days left including today.
 * Using spending *before* today keeps the limit steady while you spend during the day;
 * it only moves at midnight (underspend → tomorrow's limit grows, overspend → it shrinks).
 *
 * @param {Plan} plan
 * @param {Array<{ date: string, total: number }>} transactions
 */
export function computePlan(plan, transactions, now = new Date()) {
  const month = toDateKey(now).slice(0, 7);
  const today = toDateKey(now);

  const committed = sumCommitments(plan.commitments);
  const flexible = round2(plan.salary - committed);

  const monthTx = transactions.filter((t) => t.date.startsWith(month));
  const spentMonth = round2(monthTx.reduce((s, t) => s + t.total, 0));
  const spentToday = round2(monthTx.filter((t) => t.date === today).reduce((s, t) => s + t.total, 0));
  const spentBeforeToday = round2(spentMonth - spentToday);

  const daysLeft = daysInMonth(now) - now.getDate() + 1; // includes today
  const remainingFlexible = round2(flexible - spentMonth);
  const available = round2(flexible - spentBeforeToday);
  const dailyLimit = flexible > 0 ? Math.max(0, Math.floor((available / daysLeft) * 100) / 100) : 0;

  /** @type {'ok' | 'tight' | 'over'} */
  let health = 'ok';
  if (flexible <= 0 || available <= 0) health = 'over';
  else if (committed / plan.salary >= 0.7) health = 'tight';

  return {
    salary: plan.salary,
    committed,
    committedPercent: (committed / plan.salary) * 100,
    flexible,
    spentMonth,
    spentToday,
    remainingFlexible,
    daysLeft,
    dailyLimit,
    health,
  };
}
