import { STORAGE_KEYS } from '../config/constants.js';
import * as motion from '../services/motion.js';
import * as pwa from '../services/pwa.js';
import * as storage from '../services/storage.js';
import { byId } from '../utils/dom.js';
import { showToast } from './toast.js';

function mountInstallButton() {
  const button = byId('installBtn');

  pwa.onInstallAvailabilityChange((canInstall) => {
    const show = canInstall && !pwa.isStandalone();
    const wasHidden = button.classList.contains('hidden');
    button.classList.toggle('hidden', !show);
    if (show && wasHidden) motion.pop(button, 1.2);
  });

  button.addEventListener('click', async () => {
    const outcome = await pwa.promptInstall();
    if (outcome === 'accepted') showToast('Installed — find Budget on your home screen');
  });
}

/** iOS Safari never fires beforeinstallprompt, so explain the manual steps once. */
function mountIosHint() {
  const hint = byId('iosInstallHint');
  const dismissed = storage.read(STORAGE_KEYS.iosHintDismissed, false);
  if (!pwa.isIos() || pwa.isStandalone() || dismissed) return;

  hint.classList.remove('hidden');
  motion.enter(hint, { delay: 600 });
  byId('iosInstallHintClose').addEventListener('click', () => {
    hint.classList.add('hidden');
    storage.write(STORAGE_KEYS.iosHintDismissed, true);
  });
}

function showUpdateBanner(applyUpdate) {
  const banner = byId('updateBanner');
  banner.classList.remove('hidden');
  motion.toastIn(banner);
  byId('updateReloadBtn').addEventListener('click', applyUpdate, { once: true });
}

function watchConnectivity() {
  window.addEventListener('offline', () => showToast("You're offline — everything still works"));
  window.addEventListener('online', () => showToast('Back online'));
}

export function mount() {
  mountInstallButton();
  mountIosHint();
  watchConnectivity();
  pwa.registerServiceWorker({ onUpdateReady: showUpdateBanner });
  if (pwa.isStandalone()) pwa.requestPersistentStorage();
}

export function render() {}
