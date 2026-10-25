/**
 * Bottom tab bar with URL-hash routing (#overview, #add, ...).
 * Follows the WAI-ARIA tabs pattern: roving tabindex + Arrow/Home/End keys.
 */
import { DEFAULT_TAB, TAB_IDS } from '../config/constants.js';
import { byId } from '../utils/dom.js';

const listeners = new Set();
let activeTab = null;

const tabFromHash = () => {
  const id = location.hash.slice(1);
  return TAB_IDS.includes(id) ? id : DEFAULT_TAB;
};

/**
 * Notify when a tab becomes active — e.g. the form focuses its first input.
 * @param {(id: string, meta: {previous: string | null, viaKeyboard: boolean}) => void} listener
 */
export function onTabChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getActiveTab = () => activeTab;

export function activateTab(id, { focusTab = false, updateUrl = true } = {}) {
  if (!TAB_IDS.includes(id) || id === activeTab) return;
  const previous = activeTab;
  activeTab = id;

  document.querySelectorAll('[role="tab"]').forEach((tab) => {
    const selected = tab.dataset.tab === id;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focusTab) tab.focus();
  });

  document.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
    panel.hidden = panel.id !== `panel-${id}`;
  });

  const panel = byId(`panel-${id}`);
  byId('panelTitle').textContent = panel.dataset.title ?? 'Daily Budget';

  // replaceState: switching tabs shouldn't flood the browser back stack.
  if (updateUrl) history.replaceState(null, '', `#${id}`);
  window.scrollTo({ top: 0 });

  listeners.forEach((listener) => listener(id, { previous, viaKeyboard: focusTab }));
}

function handleKeydown(event) {
  const index = TAB_IDS.indexOf(activeTab);
  const moves = {
    ArrowRight: (index + 1) % TAB_IDS.length,
    ArrowLeft: (index - 1 + TAB_IDS.length) % TAB_IDS.length,
    Home: 0,
    End: TAB_IDS.length - 1,
  };
  if (!(event.key in moves)) return;
  event.preventDefault();
  activateTab(TAB_IDS[moves[event.key]], { focusTab: true });
}

export function mount() {
  const bar = byId('tabBar');
  bar.addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) activateTab(tab.dataset.tab);
  });
  bar.addEventListener('keydown', handleKeydown);

  // Any element with data-tab-link="<id>" acts as a shortcut to that tab.
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-tab-link]');
    if (link) activateTab(link.dataset.tabLink);
  });

  window.addEventListener('hashchange', () => activateTab(tabFromHash(), { updateUrl: false }));

  activateTab(tabFromHash(), { updateUrl: false });
}

export function render() {}
