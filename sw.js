/**
 * Service worker: makes the app installable and fully usable offline.
 *
 * Strategies
 *   - Page navigations   → network first, fall back to the cached shell (offline launch)
 *   - App files          → stale-while-revalidate from the versioned precache
 *   - CDN libraries      → stale-while-revalidate in a runtime cache (Tailwind, Lucide, Anime.js)
 *
 * RELEASE: bump CACHE_VERSION whenever any file in APP_SHELL changes, so clients pick up
 * the new files and the in-app "update available" banner appears.
 */
const CACHE_VERSION = 'v7';
const SHELL_CACHE = `budget-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `budget-runtime-${CACHE_VERSION}`;

/** Every same-origin file the app needs to boot offline (kept in sync by tests/sw.test.js). */
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32.png',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './src/styles/main.css',
  './src/js/main.js',
  './src/js/components/budget-card.js',
  './src/js/components/category-picker.js',
  './src/js/components/edit-sheet.js',
  './src/js/components/expense-form.js',
  './src/js/components/header.js',
  './src/js/components/install-prompt.js',
  './src/js/components/plan-card.js',
  './src/js/components/plan-sheet.js',
  './src/js/components/price-breakdown.js',
  './src/js/components/summary-cards.js',
  './src/js/components/tabs.js',
  './src/js/components/toast.js',
  './src/js/components/transaction-list.js',
  './src/js/config/constants.js',
  './src/js/core/breakdown.js',
  './src/js/core/plan.js',
  './src/js/core/selectors.js',
  './src/js/core/store.js',
  './src/js/core/validation.js',
  './src/js/services/export.js',
  './src/js/services/motion.js',
  './src/js/services/pwa.js',
  './src/js/services/sound.js',
  './src/js/services/storage.js',
  './src/js/utils/csv.js',
  './src/js/utils/date.js',
  './src/js/utils/dom.js',
  './src/js/utils/id.js',
  './src/js/utils/number.js',
];

const CDN_HOSTS = new Set(['cdn.tailwindcss.com', 'unpkg.com', 'cdn.jsdelivr.net']);

self.addEventListener('install', (event) => {
  // cache: 'reload' bypasses the HTTP cache so a new version never precaches stale files.
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('budget-') && !keep.has(key)).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

// The page asks a waiting worker to take over once the user taps "Reload".
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirstPage(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put('./index.html', response.clone());
    return response;
  } catch {
    return (await cache.match('./index.html')) ?? Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: cacheName === SHELL_CACHE });
  const network = fetch(request)
    .then((response) => {
      // Opaque (no-cors CDN scripts) responses have status 0 but are still usable.
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);

  return cached ?? (await network) ?? Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(networkFirstPage(request));
  } else if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
  } else if (CDN_HOSTS.has(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
  // Anything else goes straight to the network.
});
