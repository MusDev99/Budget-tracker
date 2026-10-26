/**
 * Monthly plan editor: net salary + commitment rows in a bottom sheet (native <dialog>),
 * with a live preview of the resulting suggested daily limit.
 */
import { COMMITMENT_SUGGESTIONS, MAX_COMMITMENTS, MAX_ITEM_LABEL_LENGTH } from '../config/constants.js';
import { computePlan, sumCommitments, validatePlan } from '../core/plan.js';
import { getCurrency, getState, setPlan } from '../core/store.js';
import * as motion from '../services/motion.js';
import { byId, hasOnScreenKeyboard, refreshIcons } from '../utils/dom.js';
import { formatMoney, round2 } from '../utils/number.js';
import { showToast } from './toast.js';

const INPUT =
  'min-w-0 w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-800 px-3 text-base placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500';

let els;
let closing = false;

const rowEls = () => [...els.rows.querySelectorAll('[data-row]')];
const readRows = () =>
  rowEls().map((row) => ({ label: row.querySelector('[data-label]').value, amount: row.querySelector('[data-amount]').value }));

function addRow({ label = '', amount = '' } = {}, { focus = false } = {}) {
  if (rowEls().length >= MAX_COMMITMENTS) return;
  const row = document.createElement('li');
  row.dataset.row = '';
  row.className = 'grid grid-cols-[minmax(0,1fr)_6.5rem_auto] gap-2 items-center';
  row.innerHTML = `
    <input data-label type="text" maxlength="${MAX_ITEM_LABEL_LENGTH}" enterkeyhint="next" placeholder="e.g. Car finance" class="${INPUT}" />
    <input data-amount type="number" inputmode="decimal" step="0.01" min="0" enterkeyhint="next" placeholder="0.00" class="${INPUT} tabular-nums" />
    <button type="button" data-remove
      class="min-h-[44px] min-w-[44px] rounded-xl grid place-items-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition">
      <i data-lucide="x" class="h-4 w-4"></i>
    </button>`;
  row.querySelector('[data-label]').value = label;
  row.querySelector('[data-amount]').value = amount;
  els.rows.appendChild(row);
  renumber();
  refreshIcons();
  if (focus) {
    row.querySelector(label ? '[data-amount]' : '[data-label]').focus();
    motion.enter(row, { distance: 6 });
  }
}

function renumber() {
  rowEls().forEach((row, i) => {
    row.querySelector('[data-label]').setAttribute('aria-label', `Commitment ${i + 1} name`);
    row.querySelector('[data-amount]').setAttribute('aria-label', `Commitment ${i + 1} amount`);
    row.querySelector('[data-remove]').setAttribute('aria-label', `Remove commitment ${i + 1}`);
  });
}

/** Live numbers from whatever is typed right now (invalid rows count as 0). */
function updateSummary() {
  const currency = getCurrency();
  const commitments = readRows()
    .map((r) => ({ label: r.label, amount: Number(r.amount) }))
    .filter((c) => Number.isFinite(c.amount) && c.amount > 0);
  const salary = round2(Number(els.salary.value) || 0);
  const committed = sumCommitments(commitments);
  const flexible = round2(salary - committed);
  const { dailyLimit } = salary > 0 ? computePlan({ salary, commitments }, getState().transactions) : { dailyLimit: 0 };

  els.committed.textContent = formatMoney(committed, currency);
  els.flexible.textContent = formatMoney(flexible, currency);
  els.flexible.classList.toggle('text-rose-400', flexible < 0);
  els.limit.textContent = formatMoney(dailyLimit, currency);
}

function showError(message, focusEl) {
  els.error.textContent = message;
  els.error.classList.toggle('hidden', !message);
  if (message) {
    focusEl?.focus();
    motion.shake(focusEl);
  }
}

function renderSuggestions() {
  const used = new Set(readRows().map((r) => r.label.trim().toLowerCase()));
  els.suggestions.innerHTML = COMMITMENT_SUGGESTIONS.filter((s) => !used.has(s.toLowerCase()))
    .map(
      (s) => `<button type="button" data-suggest="${s}"
        class="min-h-[44px] px-3 rounded-full border border-slate-800 bg-slate-950 text-xs text-slate-300 hover:border-emerald-500/60 hover:text-emerald-300 active:scale-95 transition">+ ${s}</button>`,
    )
    .join('');
}

export function openPlanSheet() {
  if (els.dialog.open) return;
  const { plan } = getState().settings;

  els.rows.innerHTML = '';
  els.salary.value = plan ? plan.salary.toFixed(2) : '';
  (plan?.commitments ?? []).forEach((c) => addRow({ label: c.label, amount: c.amount.toFixed(2) }));
  if (!plan) addRow();
  els.clear.classList.toggle('invisible', !plan);
  showError('');
  updateSummary();
  renderSuggestions();

  document.documentElement.classList.add('sheet-open');
  els.dialog.showModal(); // autofocus lands on the close button → no phone keyboard
  motion.sheetIn(els.dialog);
  if (!hasOnScreenKeyboard()) els.salary.focus();
}

async function closeSheet() {
  if (!els.dialog.open || closing) return;
  closing = true;
  await motion.sheetOut(els.dialog);
  els.dialog.close();
  closing = false;
}

function save() {
  const result = validatePlan({ salary: els.salary.value, rows: readRows() });
  if (!result.ok) {
    const target = result.field === 'salary' ? els.salary : rowEls()[result.index ?? 0]?.querySelector('[data-amount]');
    return showError(result.message, target);
  }
  const saved = setPlan(result.plan);
  closeSheet();
  showToast(saved ? 'Monthly plan saved' : 'Monthly plan cleared');
}

export function mount() {
  els = {
    dialog: byId('planSheet'),
    form: byId('planForm'),
    salary: byId('planSalary'),
    rows: byId('planRows'),
    suggestions: byId('planSuggestions'),
    committed: byId('planSumCommitted'),
    flexible: byId('planSumFlexible'),
    limit: byId('planSumLimit'),
    error: byId('planError'),
    clear: byId('planClear'),
  };

  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    save();
  });
  byId('planClose').addEventListener('click', closeSheet);
  els.clear.addEventListener('click', () => {
    setPlan(null);
    closeSheet();
    showToast('Monthly plan cleared');
  });
  byId('planAddRow').addEventListener('click', () => addRow({}, { focus: true }));

  els.salary.addEventListener('input', updateSummary);
  els.rows.addEventListener('input', () => {
    updateSummary();
    renderSuggestions();
  });
  els.rows.addEventListener('click', (event) => {
    const remove = event.target.closest('[data-remove]');
    if (!remove) return;
    const row = remove.closest('[data-row]');
    if (rowEls().length === 1) row.querySelectorAll('input').forEach((input) => (input.value = ''));
    else {
      row.remove();
      renumber();
    }
    updateSummary();
    renderSuggestions();
  });

  // Enter: name → amount → next row (adds one at the end) for quick entry.
  els.rows.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const row = event.target.closest('[data-row]');
    if (!row) return;
    event.preventDefault();
    if (event.target.matches('[data-label]')) return row.querySelector('[data-amount]').focus();
    const next = row.nextElementSibling;
    if (next) next.querySelector('[data-label]').focus();
    else addRow({}, { focus: true });
  });
  els.salary.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    rowEls()[0]?.querySelector('[data-label]').focus();
  });

  // Suggestion chips fill an empty row (or add one) with the label and jump to its amount.
  els.suggestions.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-suggest]');
    if (!chip) return;
    const empty = rowEls().find((r) => !r.querySelector('[data-label]').value && !r.querySelector('[data-amount]').value);
    if (empty) {
      empty.querySelector('[data-label]').value = chip.dataset.suggest;
      empty.querySelector('[data-amount]').focus();
    } else {
      addRow({ label: chip.dataset.suggest }, { focus: true });
    }
    renderSuggestions();
  });

  els.dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeSheet();
  });
  els.dialog.addEventListener('click', (event) => event.target === els.dialog && closeSheet());
  els.dialog.addEventListener('close', () => document.documentElement.classList.remove('sheet-open'));
}

/** Keep the summary in the right currency / with fresh spending if the sheet is open. */
export function render() {
  if (els.dialog.open) updateSummary();
}
