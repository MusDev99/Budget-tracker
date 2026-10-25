import { selectBudgetStatus, selectTodayStats } from '../core/selectors.js';
import { getCurrency, setDailyBudget } from '../core/store.js';
import { byId } from '../utils/dom.js';
import { formatMoney } from '../utils/number.js';
import { showToast } from './toast.js';

const LEVEL_STYLES = {
  ok:      { bar: 'bg-emerald-500', text: 'text-emerald-400' },
  warning: { bar: 'bg-amber-400',   text: 'text-amber-300' },
  over:    { bar: 'bg-rose-500',    text: 'text-rose-400' },
};

let currentBudget = 0;

export function mount() {
  const form = byId('budgetForm');
  const input = byId('budgetInput');

  byId('editBudgetBtn').addEventListener('click', () => {
    const opening = form.classList.toggle('hidden') === false;
    if (opening) {
      input.value = currentBudget || '';
      input.focus();
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    form.classList.add('hidden');
    const saved = setDailyBudget(Number(input.value));
    showToast(saved ? `Daily budget set to ${formatMoney(saved, getCurrency())}` : 'Daily budget cleared');
  });
}

export function render({ transactions, settings }) {
  currentBudget = settings.dailyBudget;
  const body = byId('budgetBody');

  if (!currentBudget) {
    body.innerHTML = `<p class="text-sm text-slate-500">No target set. Tap <span class="text-slate-300">✎</span> to set a daily limit.</p>`;
    return;
  }

  const currency = getCurrency();
  const spent = selectTodayStats(transactions).total;
  const { percent, level, remaining } = selectBudgetStatus(spent, currentBudget);
  const style = LEVEL_STYLES[level];
  const width = Math.min(100, percent);

  body.innerHTML = `
    <div class="flex items-baseline justify-between text-sm">
      <span class="tabular-nums">
        <span class="font-semibold">${formatMoney(spent, currency)}</span>
        <span class="text-slate-500">/ ${formatMoney(currentBudget, currency)}</span>
      </span>
      <span class="font-semibold tabular-nums ${style.text}">${Math.round(percent)}%</span>
    </div>
    <div class="mt-2 h-3 w-full rounded-full bg-slate-800 overflow-hidden" role="progressbar"
         aria-label="Daily budget used" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(width)}">
      <div class="h-full ${style.bar} rounded-full transition-all duration-500" style="width:${width.toFixed(1)}%"></div>
    </div>
    <p class="mt-2 text-xs ${remaining < 0 ? 'text-rose-400' : 'text-slate-400'}">
      ${remaining < 0 ? `Over budget by ${formatMoney(-remaining, currency)}` : `${formatMoney(remaining, currency)} left today`}
    </p>`;
}
