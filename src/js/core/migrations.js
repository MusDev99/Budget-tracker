/**
 * Schema versioning for persisted data (localStorage and backup files).
 *
 * To change the stored shape: bump CURRENT_SCHEMA_VERSION and append a migration
 * `{ from: <old version>, up: (data) => newData }` where data is `{ transactions, settings }`.
 * Migrations run in order, must be pure, and must never throw on odd input (sanitizers run after).
 * Pure functions only.
 */

export const CURRENT_SCHEMA_VERSION = 1;

/** @type {{ from: number, up: (data: { transactions: unknown, settings: unknown }) => { transactions: unknown, settings: unknown } }[]} */
export const MIGRATIONS = [];

/** Coerce a stored/declared version into a positive integer; anything else counts as version 1. */
export function normalizeVersion(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/**
 * Bring data from `fromVersion` up to `target`.
 * @returns {{ ok: true, data: object, version: number } | { ok: false, reason: 'newer' | 'failed' }}
 *          `newer` = data was written by a newer app, so we must not touch it.
 */
export function migrate(data, fromVersion, { migrations = MIGRATIONS, target = CURRENT_SCHEMA_VERSION } = {}) {
  let version = normalizeVersion(fromVersion);
  if (version > target) return { ok: false, reason: 'newer' };

  let current = data;
  try {
    while (version < target) {
      const step = migrations.find((m) => m.from === version);
      if (!step) return { ok: false, reason: 'failed' };
      current = step.up(current);
      version += 1;
    }
  } catch {
    return { ok: false, reason: 'failed' };
  }
  return { ok: true, data: current, version };
}
