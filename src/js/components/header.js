import { selectBudgetStatus, selectTodayStats } from '../core/selectors.js';
import { cycleCurrency, getCurrency, getState } from '../core/store.js';
import { exportTransactionsCsv } from '../services/export.js';
import * as motion from '../services/motion.js';
import { formatLongDate } from '../utils/date.js';
import { byId } from '../utils/dom.js';
import { formatMoney } from '../utils/number.js';
import { showToast } from './toast.js';

const DOT_COLORS = { ok: 'bg-emerald-500', warning: 'bg-amber-400', over: 'bg-rose-500' };

export function mount() {
  byId('currencyBtn').addEventListener('click', cycleCurrency);

  byId('exportBtn').addEventListener('click', () => {
    const { transactions } = getState();
    if (transactions.length === 0) return showToast('Nothing to export yet');
    exportTransactionsCsv(transactions, getCurrency());
    showToast(`Exported ${transactions.length} transactions`);
  });
}

export function render({ transactions, settings }) {
  const currency = getCurrency();
  const today = selectTodayStats(transactions);

  byId('todayLabel').textContent = formatLongDate();
  byId('currencyBtn').textContent = currency.code;
  document.querySelectorAll('[data-currency-label]').forEach((el) => (el.textContent = currency.code));
  document.querySelectorAll('[data-currency-symbol]').forEach((el) => (el.textContent = currency.symbol));

  // "Spent today" strip + budget status dot
  motion.countTo(byId('headerToday'), today.total, (n) => formatMoney(n, currency));
  const dot = byId('headerBudgetDot');
  dot.className = 'h-2.5 w-2.5 rounded-full';
  if (settings.dailyBudget) dot.classList.add(DOT_COLORS[selectBudgetStatus(today.total, settings.dailyBudget).level]);
  else dot.classList.add('hidden');

  // Today's item count on the History tab
  const badge = byId('historyBadge');
  badge.textContent = today.count > 99 ? '99+' : String(today.count);
  const grew = Number(badge.dataset.count ?? today.count) < today.count;
  badge.dataset.count = today.count;
  badge.classList.toggle('hidden', today.count === 0);
  if (grew) motion.pop(badge, 1.4);
}
