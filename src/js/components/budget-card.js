import { BUDGET_PRESETS } from '../config/constants.js';
import { selectBudgetStatus, selectDailyLimit, selectTodayStats } from '../core/selectors.js';
import { getCurrency, setDailyBudget } from '../core/store.js';
import * as motion from '../services/motion.js';
import { byId } from '../utils/dom.js';
import { formatMoney } from '../utils/number.js';
import { onTabChange } from './tabs.js';
import { showToast } from './toast.js';

let lastWidth = 0;

const LEVEL_STYLES = {
  ok:      { bar: 'bg-emerald-500', text: 'text-emerald-400', label: 'On track' },
  warning: { bar: 'bg-amber-400',   text: 'text-amber-300',   label: 'Getting close' },
  over:    { bar: 'bg-rose-500',    text: 'text-rose-400',    label: 'Over budget' },
};

function saveBudget(amount) {
  const saved = setDailyBudget(amount);
  byId('budgetInput').value = saved || '';
  showToast(saved ? `Daily budget set to ${formatMoney(saved, getCurrency())}` : 'Daily budget cleared');
}

function renderPresets(currentBudget) {
  byId('budgetPresets').innerHTML = BUDGET_PRESETS.map((amount) => {
    const active = amount === currentBudget;
    const tone = active
      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
      : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800';
    return `<button type="button" data-preset="${amount}" aria-pressed="${active}"
      class="min-h-[44px] rounded-xl border text-sm font-semibold tabular-nums transition active:scale-95 ${tone}">${amount}</button>`;
  }).join('');
}

export function mount() {
  const input = byId('budgetInput');

  byId('budgetForm').addEventListener('submit', (event) => {
    event.preventDefault();
    saveBudget(Number(input.value));
    input.blur();
  });

  byId('budgetPresets').addEventListener('click', (event) => {
    const button = event.target.closest('[data-preset]');
    if (!button) return;
    motion.pop(button);
    saveBudget(Number(button.dataset.preset));
  });

  onTabChange((tab) => tab === 'budget' && motion.growWidth(byId('budgetBody').querySelector('[data-bar]')));
}

export function render({ transactions, settings }) {
  const { limit: budget, source } = selectDailyLimit(settings, transactions);
  const body = byId('budgetBody');
  const fromPlan = source === 'plan';

  // The manual limit only matters without a monthly plan.
  byId('budgetForm').classList.toggle('hidden', fromPlan);
  byId('budgetHeading').textContent = fromPlan ? "Today vs Suggested Limit" : 'Today vs Target';
  renderPresets(settings.dailyBudget);
  // Don't overwrite what the user is typing.
  if (document.activeElement !== byId('budgetInput')) byId('budgetInput').value = settings.dailyBudget || '';

  if (fromPlan && !budget) {
    body.innerHTML = `<p class="text-sm text-rose-400">Nothing left to spend today under your monthly plan. Check the plan below.</p>`;
    lastWidth = 0;
    return;
  }

  if (!budget) {
    body.innerHTML = `<p class="text-sm text-slate-500">No target set. Pick a preset or enter a daily limit below.</p>`;
    lastWidth = 0;
    return;
  }

  const currency = getCurrency();
  const spent = selectTodayStats(transactions).total;
  const { percent, level, remaining } = selectBudgetStatus(spent, budget);
  const style = LEVEL_STYLES[level];
  const width = Math.min(100, percent);

  body.innerHTML = `
    <div class="flex items-end justify-between gap-2">
      <div>
        <div data-spent class="text-3xl font-bold tabular-nums tracking-tight">${formatMoney(spent, currency)}</div>
        <div class="text-xs text-slate-500 mt-0.5">of ${formatMoney(budget, currency)} ${fromPlan ? 'suggested' : 'daily'} limit</div>
      </div>
      <div class="text-right">
        <div class="text-2xl font-bold tabular-nums ${style.text}">${Math.round(percent)}%</div>
        <div class="text-xs ${style.text}">${style.label}</div>
      </div>
    </div>
    <div class="mt-3 h-3 w-full rounded-full bg-slate-800 overflow-hidden" role="progressbar"
         aria-label="Daily budget used" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(width)}">
      <div data-bar class="h-full ${style.bar} rounded-full" style="width:${width.toFixed(1)}%"></div>
    </div>
    <p class="mt-2 text-sm ${remaining < 0 ? 'text-rose-400' : 'text-slate-400'}">
      ${remaining < 0 ? `Over budget by ${formatMoney(-remaining, currency)}` : `${formatMoney(remaining, currency)} left today`}
    </p>`;

  // innerHTML rendered the final width; tween from where the bar was before.
  if (width !== lastWidth) motion.growWidth(body.querySelector('[data-bar]'), `${lastWidth}%`);
  lastWidth = width;
}
