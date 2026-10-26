/**
 * Overview card: commitments still unpaid this month, with one-tap "mark paid".
 * Hidden when there is no plan; shows a done state once everything is paid.
 */
import { paidSummary } from '../core/plan.js';
import { getCurrency, togglePaid } from '../core/store.js';
import * as motion from '../services/motion.js';
import * as sound from '../services/sound.js';
import { byId, escapeHtml, refreshIcons } from '../utils/dom.js';
import { formatMoney } from '../utils/number.js';

export function mount() {
  byId('unpaidList').addEventListener('click', (event) => {
    const button = event.target.closest('[data-pay]');
    if (!button) return;
    const row = button.closest('li');
    togglePaid(button.dataset.pay);
    sound.playCoinChing();
    navigator.vibrate?.(10);
    motion.pop(row, 1.03);
  });
}

export function render({ settings }) {
  const card = byId('unpaidCard');
  const plan = settings.plan;
  card.classList.toggle('hidden', !plan || plan.commitments.length === 0);
  if (!plan || plan.commitments.length === 0) return;

  const currency = getCurrency();
  const paid = paidSummary(plan, settings.paid);
  const unpaid = plan.commitments.filter((c) => !paid.paidIds.has(c.id));

  byId('unpaidTotal').textContent = paid.allPaid ? '' : formatMoney(paid.unpaidAmount, currency);
  byId('unpaidList').innerHTML = paid.allPaid
    ? `<li class="py-3 text-center text-sm text-emerald-400">All ${plan.commitments.length} commitments paid this month 🎉</li>`
    : unpaid
        .map(
          (c) => `<li>
            <button type="button" data-pay="${escapeHtml(c.id)}" role="checkbox" aria-checked="false"
              aria-label="Mark ${escapeHtml(c.label)} as paid, ${formatMoney(c.amount, currency)}"
              class="w-full min-h-[48px] flex items-center gap-3 rounded-xl px-1 text-left hover:bg-slate-800/60 active:bg-slate-800 transition">
              <span class="h-6 w-6 shrink-0 rounded-full border border-slate-600"></span>
              <span class="min-w-0 flex-1 truncate text-sm text-slate-200">${escapeHtml(c.label)}</span>
              <span class="tabular-nums text-sm text-slate-300">${formatMoney(c.amount, currency)}</span>
            </button>
          </li>`,
        )
        .join('');
  refreshIcons();
}
