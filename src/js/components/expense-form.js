import { CATEGORIES, DEFAULT_CATEGORY } from '../config/constants.js';
import { addTransaction, getCurrency } from '../core/store.js';
import * as motion from '../services/motion.js';
import { byId, refreshIcons } from '../utils/dom.js';
import { formatMoney, round2 } from '../utils/number.js';
import { onTabChange } from './tabs.js';
import { showToast } from './toast.js';

let selectedCategory = DEFAULT_CATEGORY;

/** A coarse primary pointer (finger) means focusing an input will open the on-screen keyboard. */
const hasOnScreenKeyboard = () => window.matchMedia?.('(pointer: coarse)').matches ?? false;
let els;

/** Empty quantity means 1; anything unparsable yields NaN so validation can reject it. */
function readQuantity() {
  const raw = els.qty.value.trim();
  return raw === '' ? 1 : Number(raw);
}

function updatePreview() {
  const price = Number(els.price.value);
  const qty = readQuantity();
  const total = Number.isFinite(price) && Number.isFinite(qty) ? round2(price * qty) : 0;
  els.preview.textContent = formatMoney(total, getCurrency());
}

function showError(message, focusEl) {
  els.error.textContent = message;
  els.error.classList.toggle('hidden', !message);
  focusEl?.focus();
  if (message) motion.shake(focusEl);
}

/** @returns {{name: string, price: number, qty: number} | null} */
function validate() {
  const name = els.name.value.trim();
  const price = Number(els.price.value);
  const qty = readQuantity();

  if (!name) return showError('Please enter an item name.', els.name), null;
  if (els.price.value.trim() === '' || !Number.isFinite(price) || price < 0) {
    return showError('Please enter a valid price.', els.price), null;
  }
  if (!Number.isFinite(qty) || qty <= 0) return showError('Quantity must be greater than 0.', els.qty), null;

  showError('');
  return { name, price, qty };
}

function submit() {
  const values = validate();
  if (!values) return;

  const tx = addTransaction({ ...values, category: selectedCategory });

  els.form.reset();
  updatePreview();
  els.name.focus();
  motion.pop(els.submit, 1.05);
  showToast(`Added ${tx.name} · ${formatMoney(tx.total, getCurrency())}`);
}

function renderCategoryPicker() {
  els.picker.innerHTML = CATEGORIES.map((c) => {
    const active = c.id === selectedCategory;
    const tone = active
      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200';
    return `
      <button type="button" role="radio" aria-checked="${active}" data-cat="${c.id}"
        class="min-h-[44px] rounded-xl border px-2 py-2 text-xs font-medium flex flex-col items-center justify-center gap-1 transition active:scale-95 ${tone}">
        <i data-lucide="${c.icon}" class="h-4 w-4"></i>
        <span class="leading-tight text-center">${c.label}</span>
      </button>`;
  }).join('');
  refreshIcons();
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
    picker: byId('categoryPicker'),
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

  els.picker.addEventListener('click', (event) => {
    const button = event.target.closest('[data-cat]');
    if (!button) return;
    selectedCategory = button.dataset.cat;
    renderCategoryPicker();
    motion.pop(els.picker.querySelector(`[data-cat="${selectedCategory}"]`), 1.08);
  });

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

  renderCategoryPicker();
}

/** Only the live total depends on store state (currency). */
export function render() {
  updatePreview();
}
