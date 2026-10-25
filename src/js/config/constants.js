/**
 * App-wide constants. Anything that is "configuration" rather than logic lives here.
 */

/** localStorage keys — bump the version suffix if the stored shape ever changes. */
export const STORAGE_KEYS = Object.freeze({
  transactions: 'dbt.transactions.v1',
  settings: 'dbt.settings.v1',
});

export const CURRENCIES = Object.freeze([
  { code: 'MYR', symbol: 'RM' },
  { code: 'USD', symbol: '$' },
]);

export const DEFAULT_CURRENCY = 'MYR';

export const CATEGORIES = Object.freeze([
  { id: 'food',      label: 'Food & Drink', icon: 'utensils',        badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  { id: 'transport', label: 'Transport',    icon: 'car',             badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  { id: 'groceries', label: 'Groceries',    icon: 'shopping-basket', badge: 'bg-lime-500/15 text-lime-300 border-lime-500/30' },
  { id: 'shopping',  label: 'Shopping',     icon: 'shopping-bag',    badge: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30' },
  { id: 'bills',     label: 'Bills',        icon: 'file-text',       badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  { id: 'other',     label: 'Other',        icon: 'tag',             badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
]);

export const CATEGORY_MAP = Object.freeze(Object.fromEntries(CATEGORIES.map((c) => [c.id, c])));

export const DEFAULT_CATEGORY = 'food';
export const FALLBACK_CATEGORY = 'other';

export const MAX_NAME_LENGTH = 80;

/** Budget progress thresholds (percent of daily target). */
export const BUDGET_THRESHOLDS = Object.freeze({ warning: 80, over: 100 });
