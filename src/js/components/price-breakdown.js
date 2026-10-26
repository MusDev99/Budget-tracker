/**
 * "Split receipt" breakdown editor, shared by the Add form and the Edit sheet.
 *
 * When switched on, the expense's price is the live sum of the receipt lines: the price
 * input becomes read-only and qty is fixed at 1. Rows live in the DOM (not re-rendered on
 * every keystroke) so typing never loses focus.
 */
import { MAX_BREAKDOWN_ITEMS, MAX_ITEM_LABEL_LENGTH } from '../config/constants.js';
import { getCurrency } from '../core/store.js';
import * as motion from '../services/motion.js';
import { refreshIcons } from '../utils/dom.js';
import { formatMoney, round2 } from '../utils/number.js';

const INPUT =
  'min-w-0 w-full min-h-[44px] rounded-xl bg-slate-900 border border-slate-800 px-3 text-base placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500';

/**
 * @param {HTMLElement} root  Empty container; the component renders into it.
 * @param {{ price: HTMLInputElement, qty: HTMLInputElement, onChange: () => void }} options
 */
export function createPriceBreakdown(root, { price, qty, onChange }) {
  root.innerHTML = `
    <button type="button" data-toggle aria-expanded="false"
      class="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 text-sm font-medium text-slate-300 hover:border-emerald-500/60 hover:text-emerald-300 transition">
      <i data-lucide="list-plus" class="h-4 w-4"></i><span data-toggle-label>Split receipt into items</span>
    </button>
    <div data-panel hidden class="mt-2 rounded-xl border border-slate-800 bg-slate-950 p-2">
      <p class="px-1 pb-2 text-xs text-slate-400">Type each line from the receipt. The total adds itself up.</p>
      <ul data-rows class="space-y-2"></ul>
      <div class="mt-2 flex items-center justify-between gap-2">
        <button type="button" data-add
          class="min-h-[44px] px-3 rounded-xl text-sm font-medium text-emerald-300 hover:bg-slate-800 flex items-center gap-1.5 transition">
          <i data-lucide="plus" class="h-4 w-4"></i>Add item
        </button>
        <p class="text-sm text-slate-400 tabular-nums" aria-live="polite">
          <span data-count>0 items</span> · <span class="text-slate-100 font-semibold" data-sum>0.00</span>
        </p>
      </div>
    </div>`;

  const toggle = root.querySelector('[data-toggle]');
  const toggleLabel = root.querySelector('[data-toggle-label]');
  const panel = root.querySelector('[data-panel]');
  const list = root.querySelector('[data-rows]');
  const addButton = root.querySelector('[data-add]');
  let active = false;

  const rowEls = () => [...list.querySelectorAll('[data-row]')];

  const rows = () =>
    rowEls().map((row) => ({
      label: row.querySelector('[data-label]').value,
      amount: row.querySelector('[data-amount]').value,
    }));

  /** Live sum of the valid amounts typed so far (invalid/blank rows count as 0). */
  const sum = () =>
    round2(rows().reduce((total, row) => {
      const amount = Number(row.amount);
      return total + (row.amount.trim() !== '' && Number.isFinite(amount) && amount > 0 ? amount : 0);
    }, 0));

  function renumber() {
    rowEls().forEach((row, i) => {
      row.querySelector('[data-label]').setAttribute('aria-label', `Item ${i + 1} name`);
      row.querySelector('[data-amount]').setAttribute('aria-label', `Item ${i + 1} amount`);
      row.querySelector('[data-remove]').setAttribute('aria-label', `Remove item ${i + 1}`);
    });
    addButton.disabled = rowEls().length >= MAX_BREAKDOWN_ITEMS;
    addButton.classList.toggle('opacity-40', addButton.disabled);
  }

  function sync() {
    if (!active) return;
    const total = sum();
    const filled = rows().filter((r) => r.amount.trim() !== '').length;
    price.value = total ? total.toFixed(2) : '';
    root.querySelector('[data-sum]').textContent = formatMoney(total, getCurrency());
    root.querySelector('[data-count]').textContent = `${filled} item${filled === 1 ? '' : 's'}`;
    onChange();
  }

  function addRow({ label = '', amount = '' } = {}, { focus = false } = {}) {
    if (rowEls().length >= MAX_BREAKDOWN_ITEMS) return null;
    const row = document.createElement('li');
    row.dataset.row = '';
    row.className = 'grid grid-cols-[minmax(0,1fr)_6.5rem_auto] gap-2 items-center';
    row.innerHTML = `
      <input data-label type="text" maxlength="${MAX_ITEM_LABEL_LENGTH}" enterkeyhint="next" placeholder="e.g. Steak" class="${INPUT}" />
      <input data-amount type="number" inputmode="decimal" step="0.01" min="0" enterkeyhint="next" placeholder="0.00" class="${INPUT} tabular-nums" />
      <button type="button" data-remove
        class="min-h-[44px] min-w-[44px] rounded-xl grid place-items-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition">
        <i data-lucide="x" class="h-4 w-4"></i>
      </button>`;
    row.querySelector('[data-label]').value = label;
    row.querySelector('[data-amount]').value = amount;
    list.appendChild(row);
    renumber();
    refreshIcons();
    if (focus) {
      row.querySelector('[data-label]').focus();
      motion.enter(row, { distance: 6 });
    }
    return row;
  }

  function setActive(next) {
    active = next;
    panel.hidden = !next;
    toggle.setAttribute('aria-expanded', String(next));
    toggleLabel.textContent = next ? 'Remove breakdown' : 'Split receipt into items';
    price.readOnly = next;
    qty.disabled = next;
    price.classList.toggle('opacity-60', next);
    qty.classList.toggle('opacity-40', next);
    if (next) qty.value = '';
  }

  toggle.addEventListener('click', () => {
    if (!active) {
      // Seed the first line with whatever was already typed so nothing is lost.
      const typed = Number(price.value) > 0 ? round2(Number(price.value) * (Number(qty.value) || 1)).toFixed(2) : '';
      list.innerHTML = '';
      setActive(true);
      addRow({ amount: typed }, { focus: true });
      motion.enter(panel, { distance: 8 });
      sync();
    } else {
      // Keep the total as a plain price when the breakdown is removed.
      const total = sum();
      setActive(false);
      list.innerHTML = '';
      price.value = total ? total.toFixed(2) : price.value;
      onChange();
    }
  });

  addButton.addEventListener('click', () => addRow({}, { focus: true }));

  list.addEventListener('input', sync);

  list.addEventListener('click', (event) => {
    const remove = event.target.closest('[data-remove]');
    if (!remove) return;
    const row = remove.closest('[data-row]');
    if (rowEls().length === 1) {
      row.querySelectorAll('input').forEach((input) => (input.value = ''));
    } else {
      row.remove();
      renumber();
    }
    sync();
  });

  // Enter moves name → amount → next row (adding one at the end) for fast receipt entry.
  list.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const row = event.target.closest('[data-row]');
    if (!row) return;
    event.preventDefault();
    if (event.target.matches('[data-label]')) return row.querySelector('[data-amount]').focus();
    const next = row.nextElementSibling;
    if (next) next.querySelector('[data-label]').focus();
    else addRow({}, { focus: true });
  });

  return {
    get active() {
      return active;
    },
    rows,
    sum,
    /** Show an existing breakdown (Edit sheet), or the collapsed toggle when there is none. */
    load(items = []) {
      list.innerHTML = '';
      setActive(items.length > 0);
      items.forEach((item) => addRow({ label: item.label, amount: item.amount.toFixed(2) }));
      sync();
    },
    reset() {
      list.innerHTML = '';
      setActive(false);
    },
    /** Focus the first row whose amount is still empty (or the first row). */
    focusFirstEmpty() {
      const row = rowEls().find((r) => r.querySelector('[data-amount]').value === '') ?? rowEls()[0];
      const target = row?.querySelector('[data-label]').value ? row.querySelector('[data-amount]') : row?.querySelector('[data-label]');
      target?.focus();
    },
    /** Input to focus/shake for a validation error on row `index`. */
    amountInput(index) {
      return rowEls()[Math.max(0, index)]?.querySelector('[data-amount]') ?? null;
    },
    /** Re-format the sum (e.g. after a currency switch). */
    refresh: sync,
  };
}
