/**
 * JSON backup: build a file from the app state and validate one before restoring it.
 * Backup files are untrusted input, so everything goes through the same sanitizers as
 * localStorage reads. Pure functions only.
 */
import { APP_NAME, MAX_BACKUP_BYTES, MAX_BACKUP_TRANSACTIONS } from '../config/constants.js';
import { CURRENT_SCHEMA_VERSION, migrate, normalizeVersion } from './migrations.js';
import { sanitizeSettings, sanitizeTransaction } from './store.js';

/** @returns {string} pretty JSON text for a backup file */
export function buildBackup({ transactions, settings }, now = new Date()) {
  return JSON.stringify(
    { app: APP_NAME, schemaVersion: CURRENT_SCHEMA_VERSION, exportedAt: now.toISOString(), transactions, settings },
    null,
    2,
  );
}

/**
 * Validate backup text.
 * @returns {{ ok: true, transactions: object[], settings: object, exportedAt: string | null, skipped: number }
 *          | { ok: false, message: string }}
 */
export function parseBackup(text) {
  if (typeof text !== 'string' || text.length > MAX_BACKUP_BYTES) return { ok: false, message: 'That file is too large to be a BudgetCare backup.' };

  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, message: 'That file is not valid JSON.' };
  }
  if (!raw || typeof raw !== 'object' || raw.app !== APP_NAME || !Array.isArray(raw.transactions)) {
    return { ok: false, message: 'That is not a BudgetCare backup file.' };
  }
  if (raw.transactions.length > MAX_BACKUP_TRANSACTIONS) return { ok: false, message: 'That backup has too many expenses.' };

  const moved = migrate({ transactions: raw.transactions, settings: raw.settings }, normalizeVersion(raw.schemaVersion));
  if (!moved.ok) {
    return {
      ok: false,
      message: moved.reason === 'newer' ? 'This backup is from a newer BudgetCare. Update the app and try again.' : 'This backup could not be upgraded.',
    };
  }

  const seen = new Set();
  const transactions = [];
  for (const item of Array.isArray(moved.data.transactions) ? moved.data.transactions : []) {
    const tx = sanitizeTransaction(item);
    if (tx && !seen.has(tx.id)) {
      seen.add(tx.id);
      transactions.push(tx);
    }
  }

  const exported = Date.parse(raw.exportedAt);
  return {
    ok: true,
    transactions,
    settings: sanitizeSettings(moved.data.settings),
    exportedAt: Number.isFinite(exported) ? new Date(exported).toISOString() : null,
    skipped: raw.transactions.length - transactions.length,
  };
}
