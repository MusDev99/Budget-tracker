/**
 * Budget tab "Your data" card: download a JSON backup, or restore one.
 * Restore is two steps (pick file → confirm) because it REPLACES all current data.
 */
import { parseBackup } from '../core/backup.js';
import { getState, restoreData } from '../core/store.js';
import { exportBackupJson } from '../services/export.js';
import { MAX_BACKUP_BYTES } from '../config/constants.js';
import { toDateKey } from '../utils/date.js';
import { byId } from '../utils/dom.js';
import { showToast } from './toast.js';

let els;
/** Validated backup waiting for the user's confirmation. */
let pending = null;

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function closeConfirm() {
  pending = null;
  els.confirm.classList.add('hidden');
  els.input.value = ''; // lets the same file be picked again
}

async function onFileChosen() {
  const file = els.input.files?.[0];
  if (!file) return;
  if (file.size > MAX_BACKUP_BYTES) {
    closeConfirm();
    return showToast('That file is too large to be a backup');
  }

  const result = parseBackup(await file.text());
  if (!result.ok) {
    closeConfirm();
    return showToast(result.message);
  }

  pending = result;
  const when = result.exportedAt ? ` from ${toDateKey(new Date(result.exportedAt))}` : '';
  const skipped = result.skipped ? ` (${plural(result.skipped, 'unreadable entry')} will be skipped)` : '';
  els.confirmText.textContent = `Replace your current data with this backup${when}: ${plural(result.transactions.length, 'expense')}${skipped}? This can't be undone.`;
  els.confirm.classList.remove('hidden');
  els.confirmBtn.focus();
}

export function mount() {
  els = {
    summary: byId('backupSummary'),
    input: byId('restoreInput'),
    confirm: byId('restoreConfirm'),
    confirmText: byId('restoreConfirmText'),
    confirmBtn: byId('restoreConfirmBtn'),
  };

  byId('backupBtn').addEventListener('click', () => {
    const { transactions, settings } = getState();
    exportBackupJson({ transactions, settings });
    showToast(`Backup saved (${plural(transactions.length, 'expense')})`);
  });

  byId('restoreBtn').addEventListener('click', () => els.input.click());
  els.input.addEventListener('change', onFileChosen);
  byId('restoreCancelBtn').addEventListener('click', closeConfirm);
  els.confirmBtn.addEventListener('click', () => {
    if (!pending) return;
    const { transactions } = restoreData(pending);
    closeConfirm();
    showToast(`Restored ${plural(transactions, 'expense')}`);
  });
}

export function render({ transactions }) {
  els.summary.textContent = `${plural(transactions.length, 'expense')} stored on this device.`;
}
