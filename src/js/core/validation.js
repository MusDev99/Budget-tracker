/**
 * Pure validation for expense input, shared by the Add form and the Edit sheet.
 * Takes raw field strings (exactly what the inputs hold) and never touches the DOM.
 */
import { MAX_NAME_LENGTH } from '../config/constants.js';
import { isDateKey, toDateKey } from '../utils/date.js';
import { round2 } from '../utils/number.js';

/** Empty quantity means 1; anything unparsable yields NaN so validation can reject it. */
export const parseQuantity = (raw) => (String(raw ?? '').trim() === '' ? 1 : Number(raw));

/** Live "price × qty" for form previews; invalid input previews as 0. */
export function previewTotal(priceText, qtyText) {
  const price = Number(priceText);
  const qty = parseQuantity(qtyText);
  return Number.isFinite(price) && Number.isFinite(qty) ? round2(price * qty) : 0;
}

/**
 * @param {{ name: string, price: string, qty: string, date?: string }} input
 * @returns {{ ok: true, values: { name: string, price: number, qty: number, date?: string } }
 *         | { ok: false, field: 'name' | 'price' | 'qty' | 'date', message: string }}
 */
export function validateExpense({ name, price, qty, date }) {
  const cleanName = String(name ?? '').trim().slice(0, MAX_NAME_LENGTH);
  const priceText = String(price ?? '').trim();
  const priceValue = Number(priceText);
  const qtyValue = parseQuantity(qty);

  if (!cleanName) return { ok: false, field: 'name', message: 'Please enter an item name.' };
  if (priceText === '' || !Number.isFinite(priceValue) || priceValue < 0) {
    return { ok: false, field: 'price', message: 'Please enter a valid price.' };
  }
  if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
    return { ok: false, field: 'qty', message: 'Quantity must be greater than 0.' };
  }
  if (date !== undefined) {
    if (!isDateKey(date)) return { ok: false, field: 'date', message: 'Please pick a date.' };
    // Lexical compare works for zero-padded YYYY-MM-DD.
    if (date > toDateKey()) return { ok: false, field: 'date', message: "Date can't be in the future." };
  }

  const values = { name: cleanName, price: priceValue, qty: qtyValue };
  if (date !== undefined) values.date = date;
  return { ok: true, values };
}
