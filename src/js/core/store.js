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
 */

const state = {
  /** @type {Transaction[]} */
  transactions: [],
  settings: { currency: DEFAULT_CURRENCY, dailyBudget: 0, soundOn: true },
};

const listeners = new Set();

// ---------- Validation / hydration ----------

/** Coerce untrusted input (localStorage, form) into a valid Transaction, or null. */
export function sanitizeTransaction(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const price = Number(raw.price);
  const qty = Number(raw.qty);
  const ts = typeof raw.ts === 'number' ? raw.ts : Date.parse(raw.ts);
  if (![price, qty, ts].every(Number.isFinite)) return null;

  return {
    id: String(raw.id || createId()),
    name: String(raw.name || 'Untitled').slice(0, MAX_NAME_LENGTH),
    price: round2(price),
    qty,
    total: round2(price * qty),
    category: CATEGORY_MAP[raw.category] ? raw.category : FALLBACK_CATEGORY,
    ts,
    date: isDateKey(raw.date) ? raw.date : toDateKey(new Date(ts)),
  };
}

export function sanitizeSettings(raw) {
  const budget = Number(raw?.dailyBudget);
  return {
    currency: CURRENCIES.some((c) => c.code === raw?.currency) ? raw.currency : DEFAULT_CURRENCY,
    dailyBudget: Number.isFinite(budget) && budget > 0 ? round2(budget) : 0,
    soundOn: raw?.soundOn !== false, // default on; only an explicit false mutes
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
export function addTransaction({ name, price, qty, category }) {
  const now = new Date();
  const tx = sanitizeTransaction({ id: createId(), name, price, qty, category, ts: now.getTime(), date: toDateKey(now) });
  state.transactions.push(tx);
  persistTransactions();
  emit();
  return tx;
}

/**
 * Apply edits to an existing transaction. Changing `date` moves it to that day but keeps
 * its time of day, so ordering within the day stays sensible.
 * @param {string} id
 * @param {Partial<Pick<Transaction, 'name' | 'price' | 'qty' | 'category' | 'date'>>} changes
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
