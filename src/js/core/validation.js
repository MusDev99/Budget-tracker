/**
 * Pure validation for expense input, shared by the Add form and the Edit sheet.
 * Takes raw field strings (exactly what the inputs hold) and never touches the DOM.
 */
import { MAX_BREAKDOWN_ITEMS, MAX_ITEM_LABEL_LENGTH, MAX_NAME_LENGTH } from '../config/constants.js';
import { isDateKey, toDateKey } from '../utils/date.js';
import { round2 } from '../utils/number.js';
import { sumItems } from './breakdown.js';

/** Empty quantity means 1; anything unparsable yields NaN so validation can reject it. */
export const parseQuantity = (raw) => (String(raw ?? '').trim() === '' ? 1 : Number(raw));

/** Live "price × qty" for form previews; invalid input previews as 0. */
export function previewTotal(priceText, qtyText) {
  const price = Number(priceText);
  const qty = parseQuantity(qtyText);
  return Number.isFinite(price) && Number.isFinite(qty) ? round2(price * qty) : 0;
}

/** Optional date: must be a real YYYY-MM-DD and not in the future. */
function validateDate(date) {
  if (date === undefined) return null;
  if (!isDateKey(date)) return { ok: false, field: 'date', message: 'Please pick a date.' };
  // Lexical compare works for zero-padded YYYY-MM-DD.
  if (date > toDateKey()) return { ok: false, field: 'date', message: "Date can't be in the future." };
  return null;
}

/**
 * Validate raw breakdown rows ({ label, amount } strings straight from the inputs).
 * Fully blank rows are ignored; a missing label becomes "Item N".
 * @returns {{ ok: true, items: Array<{label: string, amount: number}> }
 *         | { ok: false, index: number, message: string }}  index = row to focus (-1 = none)
 */
export function validateItems(rows) {
  const items = [];
  for (const [index, row] of rows.entries()) {
    const label = String(row.label ?? '').trim().slice(0, MAX_ITEM_LABEL_LENGTH);
    const amountText = String(row.amount ?? '').trim();
    if (!label && !amountText) continue;

    const amount = Number(amountText);
    const name = label ? `"${label}"` : `item ${index + 1}`;
    if (amountText === '' || !Number.isFinite(amount)) return { ok: false, index, message: `Enter an amount for ${name}.` };
    if (amount <= 0) return { ok: false, index, message: `Amount for ${name} must be more than 0.` };
    items.push({ label: label || `Item ${items.length + 1}`, amount: round2(amount) });
  }
  if (items.length === 0) return { ok: false, index: 0, message: 'Add at least one item to the breakdown.' };
  if (items.length > MAX_BREAKDOWN_ITEMS) return { ok: false, index: -1, message: `Up to ${MAX_BREAKDOWN_ITEMS} items per expense.` };
  return { ok: true, items };
}

/**
 * @param {{ name: string, price: string, qty: string, date?: string,
 *           items?: Array<{label: string, amount: string}> }} input
 *   When `items` is given (breakdown mode) the price comes from their sum and qty is 1.
 * @returns {{ ok: true, values: { name: string, price: number, qty: number, date?: string } }
 *         | { ok: false, field: 'name' | 'price' | 'qty' | 'date' | 'items', message: string, index?: number }}
 */
export function validateExpense({ name, price, qty, date, items }) {
  const cleanName = String(name ?? '').trim().slice(0, MAX_NAME_LENGTH);
  if (!cleanName) return { ok: false, field: 'name', message: 'Please enter an item name.' };

  if (items !== undefined) {
    const result = validateItems(items);
    if (!result.ok) return { ok: false, field: 'items', message: result.message, index: result.index };
    const dateError = validateDate(date);
    if (dateError) return dateError;
    const values = { name: cleanName, price: sumItems(result.items), qty: 1, items: result.items };
    if (date !== undefined) values.date = date;
    return { ok: true, values };
  }

  const priceText = String(price ?? '').trim();
  const priceValue = Number(priceText);
  const qtyValue = parseQuantity(qty);

  if (priceText === '' || !Number.isFinite(priceValue) || priceValue < 0) {
    return { ok: false, field: 'price', message: 'Please enter a valid price.' };
  }
  if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
    return { ok: false, field: 'qty', message: 'Quantity must be greater than 0.' };
  }
  const dateError = validateDate(date);
  if (dateError) return dateError;

  // items: [] tells updateTransaction to drop a breakdown that was switched off.
  const values = { name: cleanName, price: priceValue, qty: qtyValue, items: [] };
  if (date !== undefined) values.date = date;
  return { ok: true, values };
}
