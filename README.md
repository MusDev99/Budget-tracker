# 💰 Budget Tracker

Mobile-first **Daily Budget & Expense Tracker** for quick, on-the-go entry.
Vanilla HTML + ES modules + Tailwind CDN + Anime.js v4. **No build step**: it deploys straight to GitHub Pages.

## ✨ Features

| Feature | Details |
|---|---|
| 📑 Tab view | Bottom tab bar: Overview · Add · Budget · History. Deep links (`#history`), arrow-key navigation, opens on **Add** |
| ➕ Quick add | Item, price, optional quantity (1 if empty), category. Live `Total = Price × Qty`. Enter submits |
| 📊 Overview | Spent Today, This Month, daily average and a per-category breakdown for the month |
| 🎯 Daily budget | Progress bar: 🟢 < 80% · 🟡 80–100% · 🔴 > 100%, plus one-tap presets |
| 📌 Spent-today strip | Shown on every tab with a budget status dot; History tab badge counts today's items |
| 🧾 History | Grouped by day, category badges, search + category filter, 1-tap delete |
| 💱 Currency | Toggle MYR (RM) / USD ($) |
| 💾 Persistence | `localStorage`; corrupt data falls back safely; syncs across tabs |
| 🎬 Motion | Anime.js: intro sequence, tab transitions, count-up totals, growing bars, row highlight/collapse, form shake, springy toast |
| 🌍 World hero | Animated SVG on Overview: globe grid draws itself, route arc draws, plane flies the route on a loop |
| 📲 PWA | Installable (Android/desktop install button, iOS "Add to Home Screen" hint), works fully offline, in-app update banner |
| 📤 Export | 1-tap CSV (Excel-friendly; cells that look like formulas are escaped) |

## 🗂️ Project structure

```
budget-tracker/
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
│       │   └── selectors.js    # Pure derived data (today/month stats, filter, group)
│       ├── services/
│       │   ├── storage.js      # Safe localStorage read/write
│       │   ├── motion.js       # Anime.js wrapper (lazy-loaded, no-op fallback)
│       │   ├── pwa.js          # SW registration, install prompt, persistent storage
│       │   └── export.js       # CSV build + browser download
│       ├── components/         # UI modules, each exposes mount() + render(state)
│       │   ├── tabs.js         # Bottom tab bar + #hash routing (ARIA tabs pattern)
│       │   ├── install-prompt.js  # Install button, iOS hint, update banner, offline toasts
│       │   ├── header.js
│       │   ├── summary-cards.js
│       │   ├── budget-card.js
│       │   ├── expense-form.js
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
