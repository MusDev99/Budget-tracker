/**
 * Monthly plan card on the Budget tab: salary → commitments → flexible balance →
 * suggested daily limit. Read-only; editing happens in plan-sheet.js.
 */
import { computePlan } from '../core/plan.js';
import { getCurrency } from '../core/store.js';
import * as motion from '../services/motion.js';
import { byId, escapeHtml } from '../utils/dom.js';
import { formatMoney } from '../utils/number.js';
import { openPlanSheet } from './plan-sheet.js';
import { onTabChange } from './tabs.js';

const HEALTH = {
  ok:    { text: 'text-emerald-400', note: null },
  tight: { text: 'text-amber-300',   note: 'Commitments take most of your salary, so there is little room for daily spending.' },
  over:  { text: 'text-rose-400',    note: 'No flexible money left this month. Review your commitments or spending.' },
};

function emptyHtml() {
  return `
    <div class="text-center py-2">
      <p class="text-sm text-slate-300">Plan your month around fixed costs.</p>
      <p class="mt-1 text-xs text-slate-500">Enter your net salary and commitments (car, house, bills). BudgetCare suggests how much you can spend each day.</p>
    </div>`;
}

function activeHtml(settings, plan, currency) {
  const money = (n) => formatMoney(n, currency);
  const { text, note } = HEALTH[plan.health];
  const commitPct = Math.min(100, plan.committedPercent);
  const spentPct = plan.flexible > 0 ? Math.min(100, (plan.spentMonth / plan.flexible) * 100) : 100;

  const rows = settings.plan.commitments
    .map((c) => `<li class="flex justify-between gap-3 text-sm"><span class="truncate text-slate-400">${escapeHtml(c.label)}</span><span class="tabular-nums text-slate-300">${money(c.amount)}</span></li>`)
    .join('');

  return `
    <div class="rounded-xl bg-slate-950 border border-slate-800 p-3">
      <div class="flex items-center justify-between gap-2 text-xs text-slate-400">
        <span>Suggested daily limit</span><span>${plan.daysLeft} day${plan.daysLeft === 1 ? '' : 's'} left</span>
      </div>
      <div data-limit class="mt-1 text-3xl font-bold tabular-nums tracking-tight ${text}">${money(plan.dailyLimit)}</div>
      <div class="text-xs text-slate-500">per day, for the rest of this month</div>
    </div>
    ${note ? `<p class="mt-2 text-xs ${text}">${note}</p>` : ''}

    <dl class="mt-3 space-y-1.5 text-sm tabular-nums">
      <div class="flex justify-between"><dt class="text-slate-400">Net salary</dt><dd class="font-semibold">${money(plan.salary)}</dd></div>
      <ul class="pl-3 border-l border-slate-800 space-y-1">${rows || '<li class="text-xs text-slate-500">No commitments added</li>'}</ul>
      <div class="flex justify-between"><dt class="text-slate-400">Commitments</dt><dd class="font-semibold text-amber-300">− ${money(plan.committed)}</dd></div>
      <div class="flex justify-between border-t border-slate-800 pt-1.5"><dt class="text-slate-400">Left for daily spending</dt><dd class="font-bold ${plan.flexible <= 0 ? 'text-rose-400' : ''}">${money(plan.flexible)}</dd></div>
    </dl>

    <div class="mt-4">
      <div class="flex justify-between text-xs text-slate-400">
        <span>Spent this month</span><span class="tabular-nums">${money(plan.spentMonth)} of ${money(Math.max(0, plan.flexible))}</span>
      </div>
      <div class="mt-1.5 h-2.5 rounded-full bg-slate-800 overflow-hidden" role="progressbar" aria-label="Flexible budget used"
           aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(spentPct)}">
        <div data-bar class="h-full rounded-full ${spentPct >= 100 ? 'bg-rose-500' : spentPct >= 80 ? 'bg-amber-400' : 'bg-emerald-500'}" style="width:${spentPct.toFixed(1)}%"></div>
      </div>
      <p class="mt-1.5 text-xs ${plan.remainingFlexible < 0 ? 'text-rose-400' : 'text-slate-500'}">
        ${plan.remainingFlexible < 0 ? `Over by ${money(-plan.remainingFlexible)}` : `${money(plan.remainingFlexible)} left this month`}
        · commitments are ${Math.round(commitPct)}% of salary
      </p>
    </div>`;
}

export function mount() {
  byId('planEditBtn').addEventListener('click', openPlanSheet);
  onTabChange((tab) => tab === 'budget' && motion.growWidth(byId('planBody').querySelector('[data-bar]')));
}

export function render({ transactions, settings }) {
  const body = byId('planBody');
  byId('planEditLabel').textContent = settings.plan ? 'Edit' : 'Set up';

  if (!settings.plan) {
    body.innerHTML = emptyHtml();
    return;
  }
  const plan = computePlan(settings.plan, transactions);
  body.innerHTML = activeHtml(settings, plan, getCurrency());
}
