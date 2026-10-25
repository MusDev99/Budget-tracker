import { byId } from '../utils/dom.js';

const DURATION_MS = 2200;
let hideTimer;

export function showToast(message) {
  const el = byId('toast');
  el.textContent = message;
  el.classList.remove('hidden', 'toast-enter');
  void el.offsetWidth; // restart the CSS animation
  el.classList.add('toast-enter');

  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => el.classList.add('hidden'), DURATION_MS);
}
