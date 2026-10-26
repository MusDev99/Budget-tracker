/**
 * Single source of truth for persisted app data.
 * Components read via getState()/getCurrency(), mutate only through the exported actions,
 * and re-render by subscribing. Every action persists, then notifies subscribers.
 */
import {
  CATEGORY_MAP,
  CURRENCIES,
  DEFAULT_CURRENCY,
  FALLBACK_CATEGORY,
  MAX_NAME_LENGTH,
  STORAGE_KEYS,
} from '../config/constants.js';
import { sanitizeItems, sumItems } from './breakdown.js';
import { sanitizePaid, sanitizePlan } from './plan.js';
import * as storage from '../services/storage.js';
import { isDateKey, toDateKey } from '../utils/date.js';
import { createId } from '../utils/id.js';
import { round2 } from '../utils/number.js';

/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {string} name
 * @property {number} price     Unit price, 2dp
 * @property {number} qty
 * @property {number} total     price × qty, 2dp
 * @property {string} category  Key of CATEGORY_MAP
 * @property {number} ts        Epoch ms
 * @property {string} date      Local YYYY-MM-DD
 * @property {import('./breakdown.js').BreakdownItem[]} [items]  Receipt breakdown; when present
 *           price = sum of items and qty = 1
 */

const state = {
  /** @type {Transaction[]} */
  transactions: [],
  settings: { currency: DEFAULT_CURRENCY, dailyBudget: 0, soundOn: true, plan: null, paid: {} },
};

const listeners = new Set();

// ---------- Validation / hydration ----------

/** Coerce untrusted input (localStorage, form) into a valid Transaction, or null. */
export function sanitizeTransaction(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const items = sanitizeItems(raw.items);
  // A breakdown is the source of truth for the amount: price = sum of items, qty = 1.
  const price = items.length ? sumItems(items) : Number(raw.price);
  const qty = items.length ? 1 : Number(raw.qty);
  const ts = typeof raw.ts === 'number' ? raw.ts : Date.parse(raw.ts);
  if (![price, qty, ts].every(Number.isFinite)) return null;

  const tx = {
    id: String(raw.id || createId()),
    name: String(raw.name || 'Untitled').slice(0, MAX_NAME_LENGTH),
    price: round2(price),
    qty,
    total: round2(price * qty),
    category: CATEGORY_MAP[raw.category] ? raw.category : FALLBACK_CATEGORY,
    ts,
    date: isDateKey(raw.date) ? raw.date : toDateKey(new Date(ts)),
  };
  if (items.length) tx.items = items;
  return tx;
}

export function sanitizeSettings(raw) {
  const budget = Number(raw?.dailyBudget);
  return {
    currency: CURRENCIES.some((c) => c.code === raw?.currency) ? raw.currency : DEFAULT_CURRENCY,
    dailyBudget: Number.isFinite(budget) && budget > 0 ? round2(budget) : 0,
    soundOn: raw?.soundOn !== false, // default on; only an explicit false mutes
    plan: sanitizePlan(raw?.plan), // null until the user sets a salary
    paid: sanitizePaid(raw?.paid), // { 'YYYY-MM': [commitmentId] }
  };
}

function loadTransactions() {
  const raw = storage.read(STORAGE_KEYS.transactions, []);
  return (Array.isArray(raw) ? raw : []).map(sanitizeTransaction).filter(Boolean);
}

const loadSettings = () => sanitizeSettings(storage.read(STORAGE_KEYS.settings, {}));

// ---------- Pub/sub ----------

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((listener) => listener(state));
}

const persistTransactions = () => storage.write(STORAGE_KEYS.transactions, state.transactions);
const persistSettings = () => storage.write(STORAGE_KEYS.settings, state.settings);

// ---------- Public API ----------

export function initStore() {
  state.transactions = loadTransactions();
  state.settings = loadSettings();
  // Plans saved before commitments had ids get theirs generated on load; persist them once
  // so "paid" ticks stay attached across reloads.
  if (state.settings.plan) persistSettings();

  // Keep multiple open tabs in sync.
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEYS.transactions) state.transactions = loadTransactions();
    else if (event.key === STORAGE_KEYS.settings) state.settings = loadSettings();
    else return;
    emit();
  });
}

export const getState = () => state;

export const getCurrency = () =>
  CURRENCIES.find((c) => c.code === state.settings.currency) ?? CURRENCIES[0];

/** @returns {Transaction} */
export function addTransaction({ name, price, qty, category, items }) {
  const now = new Date();
  const tx = sanitizeTransaction({ id: createId(), name, price, qty, category, items, ts: now.getTime(), date: toDateKey(now) });
  state.transactions.push(tx);
  persistTransactions();
  emit();
  return tx;
}

/**
 * Apply edits to an existing transaction. Changing `date` moves it to that day but keeps
 * its time of day, so ordering within the day stays sensible.
 * @param {string} id
 * @param {Partial<Pick<Transaction, 'name' | 'price' | 'qty' | 'category' | 'date' | 'items'>>} changes
 *        Pass `items: []` to remove a breakdown.
 * @returns {Transaction | null} the updated transaction, or null if it no longer exists
 */
export function updateTransaction(id, changes) {
  const index = state.transactions.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const current = state.transactions[index];
  let { ts } = current;
  if (changes.date && changes.date !== current.date) {
    const [y, m, d] = changes.date.split('-').map(Number);
    const moved = new Date(current.ts);
    moved.setFullYear(y, m - 1, d);
    ts = moved.getTime();
  }

  const updated = sanitizeTransaction({ ...current, ...changes, id: current.id, ts });
  if (!updated) return null;
  state.transactions[index] = updated;
  persistTransactions();
  emit();
  return updated;
}

/** @returns {Transaction | null} the removed transaction */
export function deleteTransaction(id) {
  const index = state.transactions.findIndex((t) => t.id === id);
  if (index === -1) return null;
  const [removed] = state.transactions.splice(index, 1);
  persistTransactions();
  emit();
  return removed;
}

export function setDailyBudget(amount) {
  state.settings = sanitizeSettings({ ...state.settings, dailyBudget: amount });
  persistSettings();
  emit();
  return state.settings.dailyBudget;
}

/** Save (or clear with null) the monthly plan. @returns {import('./plan.js').Plan | null} */
export function setPlan(plan) {
  state.settings = sanitizeSettings({ ...state.settings, plan });
  persistSettings();
  emit();
  return state.settings.plan;
}

/** Tick / untick a commitment as paid for the current month. @returns {boolean} now paid */
export function togglePaid(id, now = new Date()) {
  const month = toDateKey(now).slice(0, 7);
  const ticked = new Set(state.settings.paid[month] ?? []);
  const nowPaid = !ticked.has(id);
  if (nowPaid) ticked.add(id);
  else ticked.delete(id);
  state.settings = sanitizeSettings({ ...state.settings, paid: { ...state.settings.paid, [month]: [...ticked] } });
  persistSettings();
  emit();
  return nowPaid;
}

export function toggleSound() {
  state.settings.soundOn = !state.settings.soundOn;
  persistSettings();
  emit();
  return state.settings.soundOn;
}

export function cycleCurrency() {
  const index = CURRENCIES.findIndex((c) => c.code === state.settings.currency);
  state.settings.currency = CURRENCIES[(index + 1) % CURRENCIES.length].code;
  persistSettings();
  emit();
}

/** Force a re-render without changing data (e.g. the date rolled over at midnight). */
export const refresh = emit;
