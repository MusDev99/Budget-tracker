/**
 * Escape a single CSV cell (RFC 4180) and neutralise spreadsheet formula injection
 * (cells starting with = + - @ are prefixed with an apostrophe).
 */
export function toCsvCell(value) {
  let s = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** @param {Array<Array<unknown>>} rows  First row is the header. */
export const toCsv = (rows) => rows.map((row) => row.map(toCsvCell).join(',')).join('\r\n');
