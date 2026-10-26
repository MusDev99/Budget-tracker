/**
 * App entry point: hydrate the store, mount components, wire re-rendering.
 */
import * as budgetCard from './components/budget-card.js';
import * as editSheet from './components/edit-sheet.js';
import * as expenseForm from './components/expense-form.js';
import * as header from './components/header.js';
import * as installPrompt from './components/install-prompt.js';
import * as planCard from './components/plan-card.js';
import * as planSheet from './components/plan-sheet.js';
import * as summaryCards from './components/summary-cards.js';
import * as tabs from './components/tabs.js';
import { showToast } from './components/toast.js';
import * as transactionList from './components/transaction-list.js';
import * as unpaidCommitments from './components/unpaid-commitments.js';
import { getState, initStore, refresh, subscribe } from './core/store.js';
import * as motion from './services/motion.js';
import { onWriteError } from './services/storage.js';
import { toDateKey } from './utils/date.js';
import { refreshIcons } from './utils/dom.js';

// Order matters: tabs mount first so the initial activation doesn't trigger other components' tab listeners.
const components = [tabs, header, summaryCards, unpaidCommitments, budgetCard, planCard, planSheet, expenseForm, transactionList, editSheet, installPrompt];

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

/** First-paint choreography: header drops in, cards rise in sequence, tab bar slides up. */
function playIntro() {
  const panel = document.querySelector('[role="tabpanel"]:not([hidden])');
  motion.enter(document.querySelector('header'), { distance: -12 });
  motion.enter(panel?.children, { delay: 120 });
  motion.slideUp(document.querySelector('nav'), 200);
  if (tabs.getActiveTab() === 'overview') summaryCards.playOverview();
}

async function bootstrap() {
  onWriteError(() => showToast('Could not save — storage full or blocked. Export CSV now.'));
  initStore();

  // Waits at most MOTION_LOAD_TIMEOUT_MS; usually instant thanks to <link rel="modulepreload">.
  const animated = await motion.loadMotion();

  components.forEach((component) => component.mount());
  subscribe(renderAll);
  renderAll();
  if (animated) playIntro();
  watchDayRollover();
}

bootstrap();
