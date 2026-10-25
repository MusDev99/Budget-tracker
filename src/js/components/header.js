import { cycleCurrency, getCurrency, getState } from '../core/store.js';
import { exportTransactionsCsv } from '../services/export.js';
import { formatLongDate } from '../utils/date.js';
import { byId } from '../utils/dom.js';
import { showToast } from './toast.js';

export function mount() {
  byId('currencyBtn').addEventListener('click', cycleCurrency);

  byId('exportBtn').addEventListener('click', () => {
    const { transactions } = getState();
    if (transactions.length === 0) return showToast('Nothing to export yet');
    exportTransactionsCsv(transactions, getCurrency());
    showToast(`Exported ${transactions.length} transactions`);
  });
}

export function render() {
  const { code } = getCurrency();
  byId('todayLabel').textContent = formatLongDate();
  byId('currencyBtn').textContent = code;
  document.querySelectorAll('[data-currency-label]').forEach((el) => (el.textContent = code));
}
