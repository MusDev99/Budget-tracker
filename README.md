# 💰 BudgetCare

Mobile-first money planner: set your salary and monthly commitments, get a **suggested daily spending limit**, and track everyday expenses on the go.
Vanilla HTML + ES modules + prebuilt Tailwind CSS + Anime.js v4. **No deploy build**: the Tailwind stylesheet is built once and committed, so the repo deploys straight to GitHub Pages.

## ✨ Features

| Feature | Details |
|---|---|
| 📑 Tab view | Bottom tab bar: Overview · Add · Budget · History. Deep links (`#history`), arrow-key navigation, opens on **Add** |
| ➕ Quick add | Item, price, optional quantity (1 if empty), category. Live `Total = Price × Qty`. Enter submits |
| 🧮 Split receipt | Break one expense into receipt lines (Steak 30 + Drink 10 + Dessert 10); the total sums itself, items are saved, searchable, shown in History and exported to CSV |
| 📊 Overview | Spent Today, This Month, daily average and a per-category breakdown for the month |
| 🏦 Monthly plan | Enter net salary + fixed commitments (car finance, house, bills). The rest is your flexible balance; BudgetCare suggests a daily limit = (flexible − spent on earlier days) ÷ days left, recalculated every day |
| ✅ Paid tracking | Commitments repeat every month with no re-entry. Tap one to tick it paid for this month (resets itself next month); shows "Paid 2 of 3 · RM x still to pay" |
| 💸 Unpaid commitments | Overview card listing what is still to pay this month (total + one-tap mark as paid); done state when all are paid |
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
│   │   ├── tailwind.css        # Built by `npm run build:css` (committed, don't edit)
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
│       │   ├── unpaid-commitments.js  # Overview card: unpaid commitments, tap to pay
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
├── tailwind/input.css          # Tailwind entry (@tailwind base/components/utilities)
├── tailwind.config.js          # Content globs: index.html + src/js/**/*.js
├── scripts/check-syntax.js     # Zero-dependency lint: every JS file must parse
├── tests/                      # node:test unit tests (no dependencies)
├── .github/                    # CI (verify), branch-policy, PR template
├── CLAUDE.md                   # Rules for AI agents working on this repo
├── package.json                # Dev scripts (start, build:css, test, verify)
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
npm ci && npm run verify  # syntax check + tests + Tailwind build is committed (what CI runs)
```

## 🎨 Styling (Tailwind)

Tailwind v3 is compiled ahead of time, not in the browser (the Play CDN is for prototyping only).

1. Use Tailwind classes in `index.html` or JS templates as usual. Write **full class names** (`'text-rose-400'`), never `'text-' + colour`, or the build won't see them.
2. Run `npm run build:css` and commit `src/styles/tailwind.css` with your change. CI fails if it is stale.

## 🔐 CDN libraries

Lucide and Anime.js load from jsDelivr, pinned to an exact version with **Subresource Integrity** (`integrity="sha384-..."` + `crossorigin="anonymous"`; Anime.js's hash is also in the import map for its dynamic `import()`). A changed file is refused: icons fall back to nothing and animations are skipped, the app keeps working. To upgrade a library, change the version and recompute the hash from the npm package:

```bash
npm pack lucide@X.Y.Z && tar xzf lucide-X.Y.Z.tgz
echo "sha384-$(openssl dgst -sha384 -binary package/dist/umd/lucide.min.js | openssl base64 -A)"
```

`tests/html.test.js` fails if a CDN tag lacks a pinned version, SRI or CORS.

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
| CDN libs (Lucide, Anime.js) | Stale-while-revalidate runtime cache (CORS 200s only, so SRI still applies) |

**Release checklist**
1. Added or renamed a file? Add it to `APP_SHELL` in `sw.js` (`npm test` fails if you forget).
2. Bump `CACHE_VERSION` in `sw.js`.
3. Push. Open clients see **"A new version is ready → Reload"**.

> ℹ️ Data lives in `localStorage` per browser. On iOS the home-screen app has **separate storage from Safari**, so export a CSV before switching.
> 🛠️ Local dev: in DevTools → Application → Service Workers, tick **Update on reload** to skip the cache.

## 🌐 Deploy (GitHub Pages)

Settings → Pages → **Deploy from a branch** → `master` / `(root)`.

Changes reach `master` only through a pull request (see [BRANCHING.md](https://github.com/MusDev99/agentic-coding-style/blob/main/BRANCHING.md)): `fix/`, `feat/`, `chore/` or `docs/` branch, Conventional Commit PR title, `ci / verify` and `branch-policy` green, squash merge.
