import { addTransaction, getCurrency } from '../core/store.js';
import { previewTotal, validateExpense } from '../core/validation.js';
import * as motion from '../services/motion.js';
import { byId, hasOnScreenKeyboard } from '../utils/dom.js';
import { formatMoney } from '../utils/number.js';
import { createCategoryPicker } from './category-picker.js';
import { onTabChange } from './tabs.js';
import { showToast } from './toast.js';

let els;
let picker;

function updatePreview() {
  els.preview.textContent = formatMoney(previewTotal(els.price.value, els.qty.value), getCurrency());
}

function showError(message, focusEl) {
  els.error.textContent = message;
  els.error.classList.toggle('hidden', !message);
  focusEl?.focus();
  if (message) motion.shake(focusEl);
}

function submit() {
  const result = validateExpense({ name: els.name.value, price: els.price.value, qty: els.qty.value });
  if (!result.ok) return showError(result.message, els[result.field]);
  showError('');

  const tx = addTransaction({ ...result.values, category: picker.value });

  els.form.reset();
  updatePreview();
  els.name.focus();
  motion.pop(els.submit, 1.05);
  showToast(`Added ${tx.name} · ${formatMoney(tx.total, getCurrency())}`);
}

/** Enter on name/price jumps to the next field, or submits once the required fields are filled. */
function handleEnterKey(event, next) {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  if (!next || (els.name.value.trim() && els.price.value.trim())) submit();
  else next.focus();
}

export function mount() {
  els = {
    form: byId('expenseForm'),
    name: byId('itemName'),
    price: byId('itemPrice'),
    qty: byId('itemQty'),
    preview: byId('previewTotal'),
    error: byId('formError'),
    submit: byId('expenseForm').querySelector('[type="submit"]'),
  };

  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit();
  });
  els.name.addEventListener('keydown', (e) => handleEnterKey(e, els.price));
  els.price.addEventListener('keydown', (e) => handleEnterKey(e, els.qty));
  els.qty.addEventListener('keydown', (e) => handleEnterKey(e, null));
  [els.price, els.qty].forEach((el) => el.addEventListener('input', updatePreview));

  picker = createCategoryPicker(byId('categoryPicker'));

  onTabChange((tab, { previous, viaKeyboard }) => {
    // Leaving Add: close the on-screen keyboard instead of carrying it to another tab.
    if (tab !== 'add') {
      if (els.form.contains(document.activeElement)) document.activeElement.blur();
      return;
    }
    if (!previous || viaKeyboard) return;

    // Touch screens: never pop the keyboard just for opening the tab — glow the first field
    // so the user knows where to tap. Mouse/trackpad devices have no on-screen keyboard,
    // so jump straight into typing there.
    if (hasOnScreenKeyboard()) motion.attention(els.name);
    else els.name.focus();
  });
}

/** Only the live total depends on store state (currency). */
export function render() {
  updatePreview();
}
