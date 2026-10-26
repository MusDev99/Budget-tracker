# 💰 BudgetCare

Mobile-first money planner: set your salary and monthly commitments, get a **suggested daily spending limit**, and track everyday expenses on the go.
Vanilla HTML + ES modules + Tailwind CDN + Anime.js v4. **No build step**: it deploys straight to GitHub Pages.

## ✨ Features

| Feature | Details |
|---|---|
| 📑 Tab view | Bottom tab bar: Overview · Add · Budget · History. Deep links (`#history`), arrow-key navigation, opens on **Add** |
| ➕ Quick add | Item, price, optional quantity (1 if empty), category. Live `Total = Price × Qty`. Enter submits |
| 🧮 Split receipt | Break one expense into receipt lines (Steak 30 + Drink 10 + Dessert 10); the total sums itself, items are saved, searchable, shown in History and exported to CSV |
| 📊 Overview | Spent Today, This Month, daily average and a per-category breakdown for the month |
| 🏦 Monthly plan | Enter net salary + fixed commitments (car finance, house, bills). The rest is your flexible balance; BudgetCare suggests a daily limit = (flexible − spent on earlier days) ÷ days left, recalculated every day |
| ✅ Paid tracking | Commitments repeat every month with no re-entry. Tap one to tick it paid for this month (resets itself next month); shows "Paid 2 of 3 · RM x still to pay" |
| 🎯 Daily budget | Progress bar: 🟢 < 80% · 🟡 80–100% · 🔴 > 100%, plus one-tap presets |
| 📌 Spent-today strip | Shown on every tab with a budget status dot; History tab badge counts today's items |
| 🧾 History | Grouped by day, category badges, search + category filter, 1-tap delete |
| ✏️ Edit | Tap any expense to open an edit sheet: name, price, qty, category, date (move to another day), delete |
| 💱 Currency | Toggle MYR (RM) / USD ($) |
| 💾 Persistence | `localStorage`; corrupt data falls back safely; syncs across tabs |
| 🎬 Motion | Anime.js: intro sequence, tab transitions, count-up totals, growing bars, row highlight/collapse, form shake, springy toast |
| 🪙 Coin hero | 3D money coin on Overview: tosses on a loop with a flip, shadow and sparkle burst; tap to flip with a synthesised coin sound (flick → ching → bounce, mutable); shows the active currency (RM / $) |
| 📲 PWA | Installable (Android/desktop install button, iOS "Add to Home Screen" hint), works fully offline, in-app update banner |
| 📤 Export | 1-tap CSV (Excel-friendly; cells that look like formulas are escaped) |

## 🗂️ Project structure

```
budgetcare/
├── index.html                  # Markup only: layout + mount points
├── manifest.webmanifest        # PWA metadata: name, icons, colours, shortcuts
├── sw.js                       # Service worker: offline cache + updates (must live at root for scope)
├── assets/icons/               # App icons (SVG sources + rendered PNGs)
├── src/
│   ├── styles/
│   │   └── main.css            # Custom CSS that Tailwind utilities don't cover
│   └── js/
│       ├── main.js             # Entry: init store → mount components → subscribe render
│       ├── config/
│       │   └── constants.js    # Storage keys, currencies, categories, thresholds
│       ├── core/
│       │   ├── store.js        # State, actions, pub/sub, validation and hydration
│       │   ├── breakdown.js    # Receipt line items: sanitize, sum, labels
│       │   ├── plan.js         # Monthly plan: validate + flexible balance + suggested daily limit
│       │   ├── selectors.js    # Pure derived data (today/month stats, filter, group)
│       │   └── validation.js   # Pure expense validation shared by Add + Edit
│       ├── services/
│       │   ├── storage.js      # Safe localStorage read/write
│       │   ├── motion.js       # Anime.js wrapper (lazy-loaded, no-op fallback)
│       │   ├── pwa.js          # SW registration, install prompt, persistent storage
│       │   ├── sound.js        # Web Audio coin sounds (no audio files)
│       │   └── export.js       # CSV build + browser download
│       ├── components/         # UI modules, each exposes mount() + render(state)
│       │   ├── tabs.js         # Bottom tab bar + #hash routing (ARIA tabs pattern)
│       │   ├── install-prompt.js  # Install button, iOS hint, update banner, offline toasts
│       │   ├── header.js
│       │   ├── summary-cards.js
│       │   ├── budget-card.js  # Today vs limit (suggested limit when a plan exists)
│       │   ├── plan-card.js    # Monthly plan summary on the Budget tab
│       │   ├── plan-sheet.js   # Bottom sheet to edit salary + commitments
│       │   ├── expense-form.js
│       │   ├── edit-sheet.js   # <dialog> bottom sheet for editing an expense
│       │   ├── category-picker.js  # Reusable category radio group
│       │   ├── price-breakdown.js  # "Split receipt" line-item editor (Add + Edit)
│       │   ├── transaction-list.js
│       │   └── toast.js
│       └── utils/              # Small pure helpers
│           ├── csv.js
│           ├── date.js
│           ├── dom.js
│           ├── id.js
│           └── number.js
├── tests/                      # node:test unit tests (no dependencies)
├── package.json                # Dev scripts only (start, test)
├── .editorconfig
├── .gitignore
└── .nojekyll                   # Serve files as-is on GitHub Pages
```

## 🏗️ Architecture

```
 user event ──▶ component ──▶ store action ──▶ storage.write
                                   │
                                   ▼ emit()
                 components.render(state)  ◀── selectors (pure)
```

- **One-way data flow**: components never change state directly; they call store actions.
- **Pure selectors** keep the business logic testable without a DOM.
- **Event delegation** on lists, so re-renders don't leak listeners.
- **Safe rendering**: all user text goes through `escapeHtml` before `innerHTML`.
- **Motion that can't break the app**: Anime.js is version-pinned, preloaded, and imported lazily.
  If the CDN fails or the user prefers reduced motion, every helper simply applies the final state.

## 🚀 Run locally

ES modules don't load from `file://`, so serve the folder over HTTP:

```bash
npm start                 # npx serve on http://localhost:5173
# or
python3 -m http.server 5173
```

## 🧪 Test

```bash
npm test                  # node --test, Node ≥ 18, no install needed
```

## 📲 PWA

| Platform | How to install |
|---|---|
| Android Chrome / desktop Chrome & Edge | Tap the 📱 button in the header (or the browser's install icon) |
| iPhone / iPad Safari | Share → **Add to Home Screen** (the app shows a one-time hint) |

**Caching**

| Request | Strategy |
|---|---|
| Page navigation | Network first → cached shell when offline |
| App files (`APP_SHELL`) | Precached on install, stale-while-revalidate |
| CDN libs (Tailwind, Lucide, Anime.js) | Stale-while-revalidate runtime cache |

**Release checklist**
1. Added or renamed a file? Add it to `APP_SHELL` in `sw.js` (`npm test` fails if you forget).
2. Bump `CACHE_VERSION` in `sw.js`.
3. Push. Open clients see **"A new version is ready → Reload"**.

> ℹ️ Data lives in `localStorage` per browser. On iOS the home-screen app has **separate storage from Safari**, so export a CSV before switching.
> 🛠️ Local dev: in DevTools → Application → Service Workers, tick **Update on reload** to skip the cache.

## 🌐 Deploy (GitHub Pages)

Settings → Pages → **Deploy from a branch** → `master` / `(root)`.
