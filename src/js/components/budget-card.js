import { BUDGET_PRESETS } from '../config/constants.js';
import { selectBudgetStatus, selectTodayStats } from '../core/selectors.js';
import { getCurrency, setDailyBudget } from '../core/store.js';
import { byId } from '../utils/dom.js';
import { formatMoney } from '../utils/number.js';
import { showToast } from './toast.js';

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
    if (button) saveBudget(Number(button.dataset.preset));
  });
}

export function render({ transactions, settings }) {
  const budget = settings.dailyBudget;
  const body = byId('budgetBody');
  renderPresets(budget);
  // Don't overwrite what the user is typing.
  if (document.activeElement !== byId('budgetInput')) byId('budgetInput').value = budget || '';

  if (!budget) {
    body.innerHTML = `<p class="text-sm text-slate-500">No target set. Pick a preset or enter a daily limit below.</p>`;
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
        <div class="text-3xl font-bold tabular-nums tracking-tight">${formatMoney(spent, currency)}</div>
        <div class="text-xs text-slate-500 mt-0.5">of ${formatMoney(budget, currency)} daily limit</div>
      </div>
      <div class="text-right">
        <div class="text-2xl font-bold tabular-nums ${style.text}">${Math.round(percent)}%</div>
        <div class="text-xs ${style.text}">${style.label}</div>
      </div>
    </div>
    <div class="mt-3 h-3 w-full rounded-full bg-slate-800 overflow-hidden" role="progressbar"
         aria-label="Daily budget used" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(width)}">
      <div class="h-full ${style.bar} rounded-full transition-all duration-500" style="width:${width.toFixed(1)}%"></div>
    </div>
    <p class="mt-2 text-sm ${remaining < 0 ? 'text-rose-400' : 'text-slate-400'}">
      ${remaining < 0 ? `Over budget by ${formatMoney(-remaining, currency)}` : `${formatMoney(remaining, currency)} left today`}
    </p>`;
}
