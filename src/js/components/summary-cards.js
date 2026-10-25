import { CATEGORY_MAP } from '../config/constants.js';
import { selectCategoryBreakdown, selectMonthStats, selectTodayStats } from '../core/selectors.js';
import { getCurrency } from '../core/store.js';
import * as motion from '../services/motion.js';
import { toMonthKey } from '../utils/date.js';
import { byId } from '../utils/dom.js';
import { formatMoney } from '../utils/number.js';
import { getActiveTab, onTabChange } from './tabs.js';

/** Animate the Overview's visuals; called on tab open and on the intro. */
export function playOverview() {
  motion.playWorld(byId('worldSvg'));
  motion.growWidth(byId('categoryBreakdown').querySelectorAll('[data-bar]'));
}

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
            <div data-bar class="h-full rounded-full ${c.bar}" style="width:${percent.toFixed(1)}%"></div>
          </div>
        </div>`;
    })
    .join('');
}

export function mount() {
  onTabChange((tab) => tab === 'overview' && playOverview());
}

export function render({ transactions }) {
  const currency = getCurrency();
  const today = selectTodayStats(transactions);
  const month = selectMonthStats(transactions);

  const money = (n) => formatMoney(n, currency);
  motion.countTo(byId('todayTotal'), today.total, money);
  byId('todayCount').textContent =
    today.count === 0 ? 'No expenses recorded today' : `${today.count} item${today.count > 1 ? 's' : ''}`;

  motion.countTo(byId('monthTotal'), month.total, money);
  byId('monthAvg').textContent = `avg ${formatMoney(month.dailyAverage, currency)} / day`;

  const breakdown = selectCategoryBreakdown(transactions);
  byId('categoryBreakdown').innerHTML = breakdownHtml(breakdown, currency);

  const monthCount = transactions.filter((t) => t.date.startsWith(toMonthKey())).length;
  byId('worldCaption').textContent = monthCount
    ? `${monthCount} expense${monthCount > 1 ? 's' : ''} across ${breakdown.length} categor${breakdown.length > 1 ? 'ies' : 'y'} this month`
    : 'Your first expense of the month starts the journey';

  // Data changed while Overview is open: let the bars grow into their new widths.
  if (getActiveTab() === 'overview') motion.growWidth(byId('categoryBreakdown').querySelectorAll('[data-bar]'));
}
