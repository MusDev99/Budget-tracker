/**
 * Reusable category radio-group (used by the Add form and the Edit sheet).
 */
import { CATEGORIES, DEFAULT_CATEGORY } from '../config/constants.js';
import * as motion from '../services/motion.js';
import { refreshIcons } from '../utils/dom.js';

/**
 * @param {HTMLElement} container  Element with role="radiogroup"
 * @param {{ initial?: string }} [options]
 * @returns {{ get value(): string, set(value: string): void }}
 */
export function createCategoryPicker(container, { initial = DEFAULT_CATEGORY } = {}) {
  let selected = initial;

  function render() {
    container.innerHTML = CATEGORIES.map((c) => {
      const active = c.id === selected;
      const tone = active
        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200';
      return `
        <button type="button" role="radio" aria-checked="${active}" data-cat="${c.id}"
          class="min-h-[44px] rounded-xl border px-2 py-2 text-xs font-medium flex flex-col items-center justify-center gap-1 transition active:scale-95 ${tone}">
          <i data-lucide="${c.icon}" class="h-4 w-4"></i>
          <span class="leading-tight text-center">${c.label}</span>
        </button>`;
    }).join('');
    refreshIcons();
  }

  container.addEventListener('click', (event) => {
    const button = event.target.closest('[data-cat]');
    if (!button) return;
    selected = button.dataset.cat;
    render();
    motion.pop(container.querySelector(`[data-cat="${selected}"]`), 1.08);
  });

  render();

  return {
    get value() {
      return selected;
    },
    set(value) {
      selected = value;
      render();
    },
  };
}
