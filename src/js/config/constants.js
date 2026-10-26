/**
 * App-wide constants. Anything that is "configuration" rather than logic lives here.
 */

/** localStorage keys — bump the version suffix if the stored shape ever changes. */
export const STORAGE_KEYS = Object.freeze({
  transactions: 'dbt.transactions.v1',
  settings: 'dbt.settings.v1',
  iosHintDismissed: 'dbt.iosHintDismissed.v1',
});

export const CURRENCIES = Object.freeze([
  { code: 'MYR', symbol: 'RM' },
  { code: 'USD', symbol: '$' },
]);

export const DEFAULT_CURRENCY = 'MYR';

export const CATEGORIES = Object.freeze([
  { id: 'food',      label: 'Food & Drink', icon: 'utensils',        bar: 'bg-orange-400',  badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  { id: 'transport', label: 'Transport',    icon: 'car',             bar: 'bg-sky-400',     badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  { id: 'groceries', label: 'Groceries',    icon: 'shopping-basket', bar: 'bg-lime-400',    badge: 'bg-lime-500/15 text-lime-300 border-lime-500/30' },
  { id: 'shopping',  label: 'Shopping',     icon: 'shopping-bag',    bar: 'bg-fuchsia-400', badge: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30' },
  { id: 'bills',     label: 'Bills',        icon: 'file-text',       bar: 'bg-violet-400',  badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  { id: 'other',     label: 'Other',        icon: 'tag',             bar: 'bg-slate-400',   badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
]);

export const CATEGORY_MAP = Object.freeze(Object.fromEntries(CATEGORIES.map((c) => [c.id, c])));

export const DEFAULT_CATEGORY = 'food';
export const FALLBACK_CATEGORY = 'other';

export const MAX_NAME_LENGTH = 80;

/** Receipt breakdown limits. */
export const MAX_BREAKDOWN_ITEMS = 30;
export const MAX_ITEM_LABEL_LENGTH = 40;

/** Budget progress thresholds (percent of daily target). */
export const BUDGET_THRESHOLDS = Object.freeze({ warning: 80, over: 100 });

/** One-tap daily budget presets shown on the Budget tab. */
export const BUDGET_PRESETS = Object.freeze([30, 50, 80, 100]);

/** Tab order matches the bottom bar; "add" is the default for quick on-the-go entry. */
export const TAB_IDS = Object.freeze(['overview', 'add', 'budget', 'history']);
export const DEFAULT_TAB = 'add';

/**
 * Coin toss timing shared by the animation (motion.js) and the sound (sound.js) so the
 * landing "ching" lands exactly when the coin does. `bounce` = landing → top of the little
 * hop, so the coin touches down again at land + 2 × bounce.
 */
export const COIN_TOSS_MS = Object.freeze({ air: 460, fall: 420, bounce: 160 });

/** Anime.js v4 ESM bundle — pinned so a new release can't change behaviour under us. */
export const ANIME_URL = 'https://cdn.jsdelivr.net/npm/animejs@4.5.0/dist/bundles/anime.esm.min.js';

/** How long the first render waits for Anime.js before rendering without the intro. */
export const MOTION_LOAD_TIMEOUT_MS = 500;
