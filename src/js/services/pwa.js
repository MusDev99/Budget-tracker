/**
 * Progressive Web App plumbing: service worker registration, update detection,
 * the install prompt, and persistent storage.
 */

// `beforeinstallprompt` can fire very early, so capture it as soon as this module is evaluated.
let deferredPrompt = null;
const installListeners = new Set();

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault(); // show our own button instead of the browser mini-infobar
  deferredPrompt = event;
  installListeners.forEach((listener) => listener(true));
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  installListeners.forEach((listener) => listener(false));
  requestPersistentStorage();
});

/** @param {(canInstall: boolean) => void} listener */
export function onInstallAvailabilityChange(listener) {
  installListeners.add(listener);
  listener(Boolean(deferredPrompt));
  return () => installListeners.delete(listener);
}

/** Show the native install dialog. @returns {Promise<'accepted' | 'dismissed' | 'unavailable'>} */
export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable';
  const prompt = deferredPrompt;
  deferredPrompt = null; // a prompt event can only be used once
  installListeners.forEach((listener) => listener(false));
  prompt.prompt();
  const { outcome } = await prompt.userChoice;
  return outcome;
}

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

/** iOS has no install prompt; users must use Share → Add to Home Screen. iPadOS reports as Mac. */
export const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Ask the browser not to evict localStorage under storage pressure. Never throws. */
export async function requestPersistentStorage() {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/**
 * Register sw.js and report when a new version is waiting.
 * @param {{ onUpdateReady: (applyUpdate: () => void) => void }} handlers
 */
export function registerServiceWorker({ onUpdateReady }) {
  if (!('serviceWorker' in navigator)) return;

  // Only reload on controller change if this page was already controlled — otherwise the
  // very first install (clients.claim) would trigger a pointless reload.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  const announce = (worker) => onUpdateReady(() => worker.postMessage({ type: 'SKIP_WAITING' }));

  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      if (registration.waiting && navigator.serviceWorker.controller) announce(registration.waiting);

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) announce(worker);
        });
      });

      // Installed apps can stay open for days: check for a new version when brought back.
      document.addEventListener('visibilitychange', () => !document.hidden && registration.update().catch(() => {}));
    } catch (err) {
      console.warn('[pwa] Service worker registration failed', err);
    }
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
