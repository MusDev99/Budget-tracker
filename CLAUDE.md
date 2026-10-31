# CLAUDE.md

BudgetCare: mobile-first money planner PWA. Vanilla HTML + ES modules, Tailwind v3 (prebuilt, committed), Lucide icons and Anime.js v4 from jsDelivr with SRI. Deployed by GitHub Pages straight from `master` / `(root)` at https://musdev99.github.io/Budget-tracker/. See `README.md` for the feature tour and architecture.

## Commands

```bash
npm start            # serve on http://localhost:5173 (ES modules don't load from file://)
npm test             # node --test, no install needed
npm run build:css    # rebuild src/styles/tailwind.css after changing any class
npm ci && npm run verify   # syntax check + tests + Tailwind build is committed (= CI)
```

## Architecture

- One-way data flow: components call actions in `src/js/core/store.js`, the store emits, components `render(state)`. Business logic lives in pure modules (`core/selectors.js`, `core/plan.js`, `core/validation.js`, `core/breakdown.js`) and is unit-tested in `tests/`.
- Every component exposes `mount()` + `render(state)`; lists use event delegation.
- Data is `localStorage` only (`services/storage.js`); reads must survive corrupt data.
- Constants (storage keys, currencies, categories, thresholds, `ANIME_URL`) live in `src/js/config/constants.js`. No magic values in components.

## Rules

- **Safe rendering**: user text goes through `escapeHtml` before `innerHTML`. CSV export escapes formula-looking cells. Never add `eval`, inline event handlers or unescaped HTML.
- **Tailwind**: never re-add the Play CDN (`cdn.tailwindcss.com`). Use full class names in markup and JS (no `'text-' + colour`), then `npm run build:css` and commit `src/styles/tailwind.css`. CI fails if it is stale. Custom CSS goes in `src/styles/main.css`.
- **CDN scripts**: exact version + `integrity="sha384-..."` + `crossorigin="anonymous"`. Anime.js's hash must also be in the import map (it is loaded with dynamic `import()`). Compute hashes from `npm pack <pkg>@<version>`, never by trusting the CDN. `tests/html.test.js` enforces this. A new CDN host must be added to `CDN_HOSTS` in `sw.js`.
- **Graceful degradation**: the app must work if a CDN library is blocked (icons guarded by `window.lucide?.`, motion helpers fall back to the final state).
- **Service worker** (`sw.js`): add every new/renamed file to `APP_SHELL` (`tests/sw.test.js` fails otherwise) and bump `CACHE_VERSION` whenever a shelled file changes, so clients see the update banner.
- **Mobile-first**: works at 375px with no horizontal scroll, touch targets ≥ 44px, respect `prefers-reduced-motion`. Follow the [Laws of UX](https://lawsofux.com/) and name the law applied in the PR.
- Keep it dependency-free at runtime. `tailwindcss` is the only dev dependency; commit `package-lock.json`.

## Git (see [BRANCHING.md](https://github.com/MusDev99/agentic-coding-style/blob/main/BRANCHING.md))

- **Never commit or push to `master`** (to be renamed `main`). Branch `feat/`, `fix/`, `chore/` or `docs/` (agent sessions may use their given `claude/` branch), short kebab-case name.
- Conventional Commits for commits and PR titles (`fix(sw): ...`), enforced by `.github/workflows/branch-policy.yml`. Fill in `.github/pull_request_template.md`. `.github/workflows/branch-cleanup.yml` deletes the branch after merge.
- `npm run verify` must pass before every commit; CI (`ci / verify`) must be green before merge. Squash merge, one concern per PR, under ~400 changed lines (the generated `tailwind.css` doesn't count).
- Update `README.md` in the same PR when behaviour, files or commands change.
