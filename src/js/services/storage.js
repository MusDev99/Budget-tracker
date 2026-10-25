/**
 * Thin, failure-tolerant wrapper around localStorage.
 * Reads never throw (corrupt JSON → fallback); writes report failure via onWriteError.
 */

let writeErrorHandler = () => {};

/** Register a callback for failed writes (quota exceeded, private mode, blocked storage). */
export function onWriteError(handler) {
  writeErrorHandler = handler;
}

export function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) ?? fallback;
  } catch (err) {
    console.warn(`[storage] read failed for "${key}"`, err);
    return fallback;
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[storage] write failed for "${key}"`, err);
    writeErrorHandler(err);
    return false;
  }
}
