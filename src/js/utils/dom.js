/** Shorthand for getElementById that fails loudly when markup and code drift apart. */
export function byId(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`[dom] Missing element #${id}`);
  return el;
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape user-provided text before interpolating it into innerHTML. */
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

/** Re-hydrate <i data-lucide> placeholders after any dynamic render. */
export function refreshIcons() {
  if (window.lucide?.createIcons) window.lucide.createIcons();
}

/** A coarse primary pointer (finger) means focusing an input will open the on-screen keyboard. */
export const hasOnScreenKeyboard = () => window.matchMedia?.('(pointer: coarse)').matches ?? false;

export function debounce(fn, wait = 120) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
