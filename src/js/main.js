/**
 * App entry point: hydrate the store, mount components, wire re-rendering.
 */
import * as budgetCard from './components/budget-card.js';
import * as expenseForm from './components/expense-form.js';
import * as header from './components/header.js';
import * as summaryCards from './components/summary-cards.js';
import * as tabs from './components/tabs.js';
import { showToast } from './components/toast.js';
import * as transactionList from './components/transaction-list.js';
import { getState, initStore, refresh, subscribe } from './core/store.js';
import { onWriteError } from './services/storage.js';
import { toDateKey } from './utils/date.js';
import { refreshIcons } from './utils/dom.js';

// Order matters: tabs mount first so the initial activation doesn't trigger other components' tab listeners.
const components = [tabs, header, summaryCards, budgetCard, expenseForm, transactionList];

function renderAll(state = getState()) {
  components.forEach((component) => component.render(state));
  refreshIcons();
}

/** "Spent Today" must roll over at midnight even if the tab stays open. */
function watchDayRollover() {
  let currentDay = toDateKey();
  const check = () => {
    if (toDateKey() === currentDay) return;
    currentDay = toDateKey();
    refresh();
  };
  setInterval(check, 60_000);
  document.addEventListener('visibilitychange', () => !document.hidden && check());
}

function bootstrap() {
  onWriteError(() => showToast('Could not save — storage full or blocked. Export CSV now.'));
  initStore();
  components.forEach((component) => component.mount());
  subscribe(renderAll);
  renderAll();
  watchDayRollover();
}

bootstrap();
