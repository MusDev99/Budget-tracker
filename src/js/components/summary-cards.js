import { selectMonthStats, selectTodayStats } from '../core/selectors.js';
import { getCurrency } from '../core/store.js';
import { byId } from '../utils/dom.js';
import { formatMoney } from '../utils/number.js';

export function mount() {}

export function render({ transactions }) {
  const currency = getCurrency();
  const today = selectTodayStats(transactions);
  const month = selectMonthStats(transactions);

  byId('todayTotal').textContent = formatMoney(today.total, currency);
  byId('todayCount').textContent =
    today.count === 0 ? 'No expenses recorded today' : `${today.count} item${today.count > 1 ? 's' : ''}`;

  byId('monthTotal').textContent = formatMoney(month.total, currency);
  byId('monthAvg').textContent = `avg ${formatMoney(month.dailyAverage, currency)} / day`;
}
