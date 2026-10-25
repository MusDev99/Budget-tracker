export const pad = (n) => String(n).padStart(2, '0');

/** Local-time YYYY-MM-DD (not UTC — a late-night expense must stay on "today"). */
export const toDateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Local-time YYYY-MM. */
export const toMonthKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export const isDateKey = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

export const fromDateKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const formatLongDate = (d = new Date()) =>
  d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

export const formatTime = (ts) => new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

export const formatClock24 = (ts) => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** "Today" / "Yesterday" / "Mon, 20 Oct 2026". */
export function formatDayHeading(key) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (key === toDateKey()) return 'Today';
  if (key === toDateKey(yesterday)) return 'Yesterday';
  return fromDateKey(key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
