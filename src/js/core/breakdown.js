/**
 * Receipt breakdown: an expense split into line items (e.g. Steak 30 + Drink 10 + Dessert 10).
 * Pure helpers shared by the store, validation, history list and CSV export.
 */
import { MAX_BREAKDOWN_ITEMS, MAX_ITEM_LABEL_LENGTH } from '../config/constants.js';
import { round2 } from '../utils/number.js';

/**
 * @typedef {Object} BreakdownItem
 * @property {string} label
 * @property {number} amount  2dp, > 0
 */

/** Coerce untrusted items (localStorage) into valid ones; drops anything unusable. */
export function sanitizeItems(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      label: String(item?.label ?? '').trim().slice(0, MAX_ITEM_LABEL_LENGTH),
      amount: round2(Number(item?.amount)),
    }))
    .filter((item) => Number.isFinite(item.amount) && item.amount > 0)
    .slice(0, MAX_BREAKDOWN_ITEMS)
    .map((item, i) => ({ ...item, label: item.label || `Item ${i + 1}` }));
}

export const sumItems = (items) => round2(items.reduce((sum, item) => sum + item.amount, 0));

/** "Steak · Drink · Dessert" for list subtitles. */
export const itemLabels = (items) => items.map((item) => item.label).join(' · ');

/** "Steak 30.00; Drink 10.00" for CSV. */
export const itemsToText = (items) => items.map((item) => `${item.label} ${item.amount.toFixed(2)}`).join('; ');
