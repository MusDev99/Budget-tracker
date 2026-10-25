import { CATEGORIES, CATEGORY_MAP } from '../config/constants.js';
import { filterTransactions, groupByDay } from '../core/selectors.js';
import { deleteTransaction, getCurrency, getState } from '../core/store.js';
import * as motion from '../services/motion.js';
import { formatDayHeading, formatTime } from '../utils/date.js';
import { byId, debounce, escapeHtml, refreshIcons } from '../utils/dom.js';
import { formatMoney } from '../utils/number.js';
import { openEditSheet } from './edit-sheet.js';
import { showToast } from './toast.js';

const filters = { query: '', category: 'all' };

/** Ids already shown once — anything new after the first render gets highlighted. */
let knownIds = null;

function emptyStateHtml(isFiltered) {
  const [icon, title, hint] = isFiltered
    ? ['search-x', 'No matching expenses', 'Try a different search or category.']
    : ['inbox', 'No expenses recorded yet', 'Add your first expense above to get started.'];
  return `
    <div class="rounded-2xl border border-dashed border-slate-800 p-8 text-center">
      <div class="mx-auto h-12 w-12 rounded-full bg-slate-900 grid place-items-center text-slate-500">
        <i data-lucide="${icon}" class="h-6 w-6"></i>
      </div>
      <p class="mt-3 text-sm font-medium text-slate-300">${title}</p>
      <p class="mt-1 text-xs text-slate-500">${hint}</p>
    </div>`;
}

function rowHtml(tx, currency) {
  const category = CATEGORY_MAP[tx.category];
  const name = escapeHtml(tx.name);
  const qtyText = tx.qty !== 1 ? `${formatMoney(tx.price, currency)} × ${+tx.qty.toFixed(3)}` : '';
  return `
    <li data-id="${escapeHtml(tx.id)}" class="flex items-center pr-1">
      <button type="button" data-edit="${escapeHtml(tx.id)}" aria-label="Edit ${name}"
        class="min-w-0 flex-1 min-h-[56px] flex items-center gap-3 pl-3 pr-2 py-2 text-left rounded-xl hover:bg-slate-800/50 active:bg-slate-800 transition">
        <span class="h-9 w-9 shrink-0 rounded-xl grid place-items-center border ${category.badge}">
          <i data-lucide="${category.icon}" class="h-4 w-4"></i>
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-medium truncate">${name}</span>
          <span class="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${category.badge}">${category.label}</span>
            <span class="text-[11px] text-slate-500">${formatTime(tx.ts)}</span>
            ${qtyText ? `<span class="text-[11px] text-slate-500 tabular-nums">· ${qtyText}</span>` : ''}
          </span>
        </span>
        <span class="text-sm font-semibold tabular-nums whitespace-nowrap">${formatMoney(tx.total, currency)}</span>
      </button>
      <button type="button" data-delete="${escapeHtml(tx.id)}" aria-label="Delete ${name}"
        class="min-h-[44px] min-w-[44px] rounded-xl grid place-items-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 active:scale-90 transition">
        <i data-lucide="trash-2" class="h-4 w-4"></i>
      </button>
    </li>`;
}

function groupHtml({ date, items, total }, currency) {
  return `
    <div>
      <div class="flex items-center justify-between px-1 mb-1.5">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-400">${escapeHtml(formatDayHeading(date))}</h3>
        <span class="text-xs font-semibold tabular-nums text-slate-300">${formatMoney(total, currency)}</span>
      </div>
      <ul class="rounded-2xl border border-slate-800 bg-slate-900 divide-y divide-slate-800 overflow-hidden">
        ${items.map((tx) => rowHtml(tx, currency)).join('')}
      </ul>
    </div>`;
}

export function mount() {
  const select = byId('categoryFilter');
  select.innerHTML =
    `<option value="all">All</option>` + CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join('');

  select.addEventListener('change', (event) => {
    filters.category = event.target.value;
    render(getState());
  });

  byId('searchInput').addEventListener(
    'input',
    debounce((event) => {
      filters.query = event.target.value;
      render(getState());
    }),
  );

  // Event delegation: one listener survives every re-render.
  byId('txList').addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-edit]');
    if (editButton) return openEditSheet(editButton.dataset.edit);

    const button = event.target.closest('[data-delete]');
    if (!button || button.disabled) return;
    button.disabled = true; // ignore double taps while the row animates out
    motion.collapse(button.closest('li')).then(() => {
      const removed = deleteTransaction(button.dataset.delete);
      if (removed) showToast(`Deleted ${removed.name}`);
    });
  });
}

export function render({ transactions }) {
  const list = byId('txList');
  const currency = getCurrency();
  const visible = filterTransactions(transactions, filters);

  byId('resultCount').textContent = transactions.length ? `${visible.length} of ${transactions.length}` : '';
  byId('editHint').classList.toggle('hidden', visible.length === 0);

  list.innerHTML = visible.length
    ? groupByDay(visible).map((group) => groupHtml(group, currency)).join('')
    : emptyStateHtml(Boolean(filters.query.trim()) || filters.category !== 'all');

  if (knownIds) {
    transactions
      .filter((tx) => !knownIds.has(tx.id))
      .forEach((tx) => motion.highlight(list.querySelector(`li[data-id="${CSS.escape(tx.id)}"]`)));
  }
  knownIds = new Set(transactions.map((tx) => tx.id));

  refreshIcons();
}
