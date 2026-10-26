import { CATEGORY_MAP } from '../config/constants.js';
import { itemsToText } from '../core/breakdown.js';
import { toCsv } from '../utils/csv.js';
import { formatClock24, toDateKey } from '../utils/date.js';

const HEADER = ['Date', 'Time', 'Item', 'Category', 'Unit Price', 'Quantity', 'Total', 'Currency', 'Breakdown'];

/** Build the CSV text for a list of transactions (oldest first). */
export function buildTransactionsCsv(transactions, currency) {
  const rows = [...transactions]
    .sort((a, b) => a.ts - b.ts)
    .map((t) => [
      t.date,
      formatClock24(t.ts),
      t.name,
      CATEGORY_MAP[t.category].label,
      t.price.toFixed(2),
      t.qty,
      t.total.toFixed(2),
      currency.code,
      itemsToText(t.items ?? []),
    ]);
  // BOM so Excel opens UTF-8 correctly.
  return '﻿' + toCsv([HEADER, ...rows]);
}

/** Trigger a browser download of the given text content. */
export function downloadText(filename, content, mime = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportTransactionsCsv(transactions, currency) {
  downloadText(`expenses-${toDateKey()}.csv`, buildTransactionsCsv(transactions, currency));
}
