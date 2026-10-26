/**
 * Edit-expense bottom sheet built on the native <dialog>: modal focus handling,
 * Escape to close and a backdrop for free. Opened from the History list.
 */
import { deleteTransaction, getCurrency, getState, updateTransaction } from '../core/store.js';
import { previewTotal, validateExpense } from '../core/validation.js';
import * as motion from '../services/motion.js';
import { toDateKey } from '../utils/date.js';
import { byId, hasOnScreenKeyboard } from '../utils/dom.js';
import { formatMoney } from '../utils/number.js';
import { createCategoryPicker } from './category-picker.js';
import { createPriceBreakdown } from './price-breakdown.js';
import { showToast } from './toast.js';

let els;
let picker;
let breakdown;
let editingId = null;
let closing = false;

function updatePreview() {
  els.total.textContent = formatMoney(previewTotal(els.price.value, els.qty.value), getCurrency());
}

function showError(message, focusEl) {
  els.error.textContent = message;
  els.error.classList.toggle('hidden', !message);
  if (message) {
    focusEl?.focus();
    motion.shake(focusEl);
  }
}

function flashRow(id) {
  motion.highlight(document.querySelector(`#txList li[data-id="${CSS.escape(id)}"]`));
}

/** Open the sheet for a transaction id. */
export function openEditSheet(id) {
  const tx = getState().transactions.find((t) => t.id === id);
  if (!tx || els.dialog.open) return;

  editingId = id;
  els.name.value = tx.name;
  els.price.value = tx.price.toFixed(2);
  els.qty.value = tx.qty === 1 ? '' : String(tx.qty);
  els.date.value = tx.date;
  els.date.max = toDateKey();
  picker.set(tx.category);
  breakdown.load(tx.items ?? []);
  showError('');
  updatePreview();

  document.documentElement.classList.add('sheet-open');
  els.dialog.showModal(); // focuses [autofocus] (the close button) → no keyboard on phones
  motion.sheetIn(els.dialog);
  if (!hasOnScreenKeyboard()) els.name.focus();
}

async function closeSheet() {
  if (!els.dialog.open || closing) return;
  closing = true;
  await motion.sheetOut(els.dialog);
  els.dialog.close();
  closing = false;
}

function save() {
  const result = validateExpense({
    name: els.name.value,
    price: els.price.value,
    qty: els.qty.value,
    date: els.date.value,
    items: breakdown.active ? breakdown.rows() : undefined,
  });
  if (!result.ok) {
    return showError(result.message, result.field === 'items' ? breakdown.amountInput(result.index) : els[result.field]);
  }

  const updated = updateTransaction(editingId, { ...result.values, category: picker.value });
  closeSheet();
  if (!updated) return showToast('That expense no longer exists');
  flashRow(updated.id);
  showToast(`Saved ${updated.name} · ${formatMoney(updated.total, getCurrency())}`);
}

function remove() {
  const removed = deleteTransaction(editingId);
  closeSheet();
  if (removed) showToast(`Deleted ${removed.name}`);
}

export function mount() {
  els = {
    dialog: byId('editSheet'),
    form: byId('editForm'),
    name: byId('editName'),
    price: byId('editPrice'),
    qty: byId('editQty'),
    date: byId('editDate'),
    total: byId('editTotal'),
    error: byId('editError'),
  };
  picker = createCategoryPicker(byId('editCategoryPicker'));
  breakdown = createPriceBreakdown(byId('editBreakdown'), { price: els.price, qty: els.qty, onChange: updatePreview });

  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    save();
  });
  byId('editClose').addEventListener('click', closeSheet);
  byId('editDelete').addEventListener('click', remove);
  [els.price, els.qty].forEach((el) => el.addEventListener('input', updatePreview));

  // Escape: animate out instead of the instant native close.
  els.dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeSheet();
  });
  // A click whose target is the <dialog> itself landed on the backdrop.
  els.dialog.addEventListener('click', (event) => event.target === els.dialog && closeSheet());
  els.dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('sheet-open');
    editingId = null;
  });
}

/** Keep the live total in the right currency if it's toggled while the sheet is open. */
export function render() {
  if (!els.dialog.open) return;
  breakdown.refresh();
  updatePreview();
}
