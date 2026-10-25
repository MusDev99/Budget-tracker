import { CATEGORY_MAP } from '../config/constants.js';
import { selectCategoryBreakdown, selectMonthStats, selectTodayStats } from '../core/selectors.js';
import { getCurrency } from '../core/store.js';
import { byId } from '../utils/dom.js';
import { formatMoney } from '../utils/number.js';

function breakdownHtml(breakdown, currency) {
  if (breakdown.length === 0) {
    return `
      <div class="py-6 text-center">
        <p class="text-sm text-slate-400">No spending this month yet.</p>
        <button type="button" data-tab-link="add"
          class="mt-3 min-h-[44px] px-4 rounded-xl border border-slate-800 text-sm font-medium text-emerald-300 hover:bg-slate-800 transition">
          Add your first expense
        </button>
      </div>`;
  }

  return breakdown
    .map(({ category, total, percent }) => {
      const c = CATEGORY_MAP[category];
      return `
        <div>
          <div class="flex items-center justify-between text-sm">
            <span class="flex items-center gap-2 text-slate-300"><i data-lucide="${c.icon}" class="h-4 w-4 text-slate-500"></i>${c.label}</span>
            <span class="tabular-nums"><span class="font-semibold">${formatMoney(total, currency)}</span>
              <span class="text-xs text-slate-500 ml-1">${Math.round(percent)}%</span></span>
          </div>
          <div class="mt-1.5 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div class="h-full rounded-full ${c.bar}" style="width:${percent.toFixed(1)}%"></div>
          </div>
        </div>`;
    })
    .join('');
}

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

  byId('categoryBreakdown').innerHTML = breakdownHtml(selectCategoryBreakdown(transactions), currency);
}
