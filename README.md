# 💰 Budget Tracker

Mobile-first **Daily Budget & Expense Tracker** for quick, on-the-go entry.
Vanilla HTML + ES modules + Tailwind CDN. **No build step**: it deploys straight to GitHub Pages.

## ✨ Features

| Feature | Details |
|---|---|
| ➕ Quick add | Item, price, optional quantity (1 if empty), category. Live `Total = Price × Qty`. Enter submits |
| 📊 Dashboard | Spent Today, This Month and the month's daily average |
| 🎯 Daily budget | Progress bar: 🟢 < 80% · 🟡 80–100% · 🔴 > 100% |
| 🧾 History | Grouped by day, category badges, search + category filter, 1-tap delete |
| 💱 Currency | Toggle MYR (RM) / USD ($) |
| 💾 Persistence | `localStorage`; corrupt data falls back safely; syncs across tabs |
| 📤 Export | 1-tap CSV (Excel-friendly; cells that look like formulas are escaped) |

## 🗂️ Project structure

```
budget-tracker/
├── index.html                  # Markup only: layout + mount points
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
│       │   └── export.js       # CSV build + browser download
│       ├── components/         # UI modules, each exposes mount() + render(state)
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

## 🌐 Deploy (GitHub Pages)

Settings → Pages → **Deploy from a branch** → `master` / `(root)`.
