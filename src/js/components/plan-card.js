/**
 * Monthly plan card on the Budget tab: salary → commitments → flexible balance →
 * suggested daily limit. Read-only; editing happens in plan-sheet.js.
 */
import { computePlan, paidSummary } from '../core/plan.js';
import { getCurrency, togglePaid } from '../core/store.js';
import * as motion from '../services/motion.js';
import * as sound from '../services/sound.js';
import { byId, escapeHtml, refreshIcons } from '../utils/dom.js';
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

function activeHtml(settings, plan, paid, currency) {
  const money = (n) => formatMoney(n, currency);
  const { text, note } = HEALTH[plan.health];
  const commitPct = Math.min(100, plan.committedPercent);
  const spentPct = plan.flexible > 0 ? Math.min(100, (plan.spentMonth / plan.flexible) * 100) : 100;

  const rows = settings.plan.commitments
    .map((c) => {
      const done = paid.paidIds.has(c.id);
      const label = escapeHtml(c.label);
      return `<li>
        <button type="button" data-paid="${escapeHtml(c.id)}" role="checkbox" aria-checked="${done}" aria-label="${label}, ${money(c.amount)}, ${done ? 'paid' : 'not paid'}"
          class="w-full min-h-[44px] flex items-center gap-3 rounded-xl px-2 text-left hover:bg-slate-800/60 active:bg-slate-800 transition">
          <span class="h-6 w-6 shrink-0 rounded-full border grid place-items-center ${done ? 'border-emerald-500 bg-emerald-500 text-slate-950' : 'border-slate-600 text-transparent'}">
            <i data-lucide="check" class="h-4 w-4"></i>
          </span>
          <span class="min-w-0 flex-1 truncate text-sm ${done ? 'text-slate-500 line-through' : 'text-slate-200'}">${label}</span>
          <span class="tabular-nums text-sm ${done ? 'text-slate-500' : 'text-slate-300'}">${money(c.amount)}</span>
        </button>
      </li>`;
    })
    .join('');
  const paidLine = settings.plan.commitments.length
    ? `<p class="mt-1 text-xs ${paid.allPaid ? 'text-emerald-400' : 'text-slate-500'}">${
        paid.allPaid ? 'All commitments paid this month 🎉' : `Paid ${paid.paidCount} of ${settings.plan.commitments.length} · ${money(paid.unpaidAmount)} still to pay`
      }</p>`
    : '';

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
      <ul class="border-l border-slate-800 pl-1">${rows || '<li class="pl-2 text-xs text-slate-500">No commitments added</li>'}</ul>
      <div class="flex justify-between"><dt class="text-slate-400">Commitments</dt><dd class="font-semibold text-amber-300">− ${money(plan.committed)}</dd></div>
      <div>${paidLine}</div>
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

  // One listener on the container survives every re-render.
  byId('planBody').addEventListener('click', (event) => {
    const button = event.target.closest('[data-paid]');
    if (!button) return;
    const nowPaid = togglePaid(button.dataset.paid);
    if (nowPaid) sound.playCoinChing();
    navigator.vibrate?.(10);
    motion.pop(byId('planBody').querySelector(`[data-paid="${CSS.escape(button.dataset.paid)}"] span`), 1.2);
  });
}

export function render({ transactions, settings }) {
  const body = byId('planBody');
  byId('planEditLabel').textContent = settings.plan ? 'Edit' : 'Set up';

  if (!settings.plan) {
    body.innerHTML = emptyHtml();
    return;
  }
  const plan = computePlan(settings.plan, transactions);
  body.innerHTML = activeHtml(settings, plan, paidSummary(settings.plan, settings.paid), getCurrency());
  refreshIcons();
}
