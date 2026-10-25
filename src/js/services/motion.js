/**
 * Animation layer on top of Anime.js v4.
 *
 * The library is loaded lazily from the CDN so a blocked or slow CDN never breaks the app:
 * every helper degrades to "apply the final state instantly". Animations are also skipped
 * when the user prefers reduced motion.
 */
import { ANIME_URL, COIN_TOSS_MS, MOTION_LOAD_TIMEOUT_MS } from '../config/constants.js';

/** @type {typeof import('animejs') | null} */
let anime = null;
let loading = null;

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

export const isEnabled = () => Boolean(anime) && !reducedMotion?.matches;

/** Load Anime.js once. Resolves true when ready, false on failure or timeout (never rejects). */
export function loadMotion(timeoutMs = MOTION_LOAD_TIMEOUT_MS) {
  loading ??= import(ANIME_URL)
    .then((mod) => {
      anime = mod;
      return true;
    })
    .catch((err) => {
      console.warn('[motion] Anime.js unavailable, animations disabled', err);
      return false;
    });
  const timeout = new Promise((resolve) => setTimeout(() => resolve(false), timeoutMs));
  return Promise.race([loading, timeout]);
}

/** Run an animation and drop its inline styles afterwards so Tailwind states (e.g. active:scale) keep working. */
function run(targets, params) {
  return anime.animate(targets, {
    ...params,
    onComplete: (animation) => {
      anime.cleanInlineStyles(animation);
      params.onComplete?.(animation);
    },
  });
}

const toArray = (targets) => (targets instanceof Element ? [targets] : [...(targets ?? [])]);

// ---------- Entrances ----------

/** Fade + rise in, staggered. */
export function enter(targets, { delay = 0, distance = 12, step = 45 } = {}) {
  const list = toArray(targets);
  if (!isEnabled() || list.length === 0) return;
  run(list, {
    opacity: { from: 0 },
    translateY: { from: distance },
    duration: 480,
    delay: anime.stagger(step, { start: delay }),
    ease: 'outExpo',
  });
}

/** Slide the bottom tab bar up from off-screen. */
export function slideUp(target, delay = 0) {
  if (!isEnabled()) return;
  run(target, { translateY: { from: '100%' }, duration: 600, delay, ease: 'outExpo' });
}

/** Springy scale pop for taps and selections. */
export function pop(target, scale = 1.18) {
  if (!isEnabled() || !target) return;
  run(target, { scale: [1, scale, 1], duration: 420, ease: 'outBack' });
}

/** Horizontal shake for validation errors. */
export function shake(target) {
  if (!isEnabled() || !target) return;
  run(target, { translateX: [0, -8, 8, -5, 5, -2, 0], duration: 420, ease: 'inOutSine' });
}

/** Emerald ring pulse that draws the eye to a field without focusing it. */
export function attention(target) {
  if (!isEnabled() || !target) return;
  run(target, {
    boxShadow: ['0 0 0 0px rgba(16, 185, 129, 0.75)', '0 0 0 8px rgba(16, 185, 129, 0)'],
    duration: 900,
    delay: 150,
    loop: 1,
    ease: 'outQuad',
  });
}

/** Briefly tint a freshly added row emerald. */
export function highlight(target) {
  if (!isEnabled() || !target) return;
  run(target, {
    backgroundColor: { from: 'rgba(16, 185, 129, 0.22)', to: 'rgba(16, 185, 129, 0)' },
    translateX: { from: -16 },
    opacity: { from: 0 },
    duration: 900,
    ease: 'outExpo',
  });
}

/** Grow bars from a starting width (default 0) to whatever width their inline style says. */
export function growWidth(targets, from = '0%') {
  const list = toArray(targets);
  if (!isEnabled() || list.length === 0) return;
  run(list, { width: { from }, duration: 800, delay: anime.stagger(60), ease: 'outExpo' });
}

/** Toast: spring up from the bottom. */
export function toastIn(target) {
  if (!isEnabled()) return;
  run(target, { opacity: { from: 0 }, translateY: { from: 24 }, scale: { from: 0.94 }, duration: 520, ease: 'outBack' });
}

/** Bottom sheet: slide up from below. */
export function sheetIn(target) {
  if (!isEnabled()) return;
  run(target, { translateY: { from: '100%' }, opacity: { from: 0.4 }, duration: 420, ease: 'outExpo' });
}

// ---------- Exits ----------

/** Bottom sheet: slide back down. Always resolves, even with animations off. */
export function sheetOut(target) {
  if (!isEnabled()) return Promise.resolve();
  return new Promise((resolve) => {
    anime.animate(target, { translateY: '100%', opacity: 0.4, duration: 240, ease: 'inQuad', onComplete: (a) => {
      anime.cleanInlineStyles(a);
      resolve();
    } });
  });
}

/** Collapse a row out of the list. Always resolves, even with animations off. */
export function collapse(target) {
  if (!isEnabled() || !target) return Promise.resolve();
  return new Promise((resolve) => {
    anime.animate(target, {
      opacity: 0,
      translateX: -48,
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
      duration: 280,
      ease: 'inQuad',
      onComplete: () => resolve(),
    });
  });
}

// ---------- Numbers ----------

const displayed = new WeakMap();

/** Count a number up/down from its last displayed value. `format` turns a number into text. */
export function countTo(el, value, format) {
  const from = displayed.get(el) ?? 0;
  displayed.set(el, value);

  if (!isEnabled() || from === value) {
    el.textContent = format(value);
    return;
  }

  const counter = { value: from };
  anime.animate(counter, {
    value,
    duration: 700,
    ease: 'outExpo',
    onUpdate: () => (el.textContent = format(counter.value)),
    onComplete: () => (el.textContent = format(value)),
  });
}

// ---------- Coin hero ----------

let coinTimeline = null;

/**
 * Money coin toss on a loop: the coin flies up while spinning five full turns (so it
 * always lands face up), the shadow shrinks and grows with the height, then sparkles burst.
 */
export function playCoin(stage) {
  if (!stage) return;
  coinTimeline?.revert(); // reopening the tab restarts cleanly instead of stacking loops
  coinTimeline = null;
  if (!isEnabled()) return;

  const coin = stage.querySelector('[data-coin]');
  const shadow = stage.querySelector('[data-coin-shadow]');
  const sparkles = stage.querySelectorAll('[data-coin-sparkle]');
  const { air, fall, bounce } = COIN_TOSS_MS;
  const land = air + fall;

  coinTimeline = anime
    .createTimeline({ loop: true, loopDelay: 2200 })
    .add(coin, { translateY: [0, -78], duration: air, ease: 'outQuad' }, 0)
    .add(coin, { translateY: [-78, 0], duration: fall, ease: 'inQuad' }, air)
    .add(coin, { rotateY: [0, 1800], duration: land, ease: 'outSine' }, 0)
    .add(coin, { translateY: [0, -12, 0], duration: bounce * 2, ease: 'outQuad' }, land)
    .add(shadow, { scaleX: [1, 0.45], opacity: [0.9, 0.3], duration: air, ease: 'outQuad' }, 0)
    .add(shadow, { scaleX: [0.45, 1], opacity: [0.3, 0.9], duration: fall, ease: 'inQuad' }, air)
    .add(sparkles, { scale: [0, 1.2, 0], opacity: [0, 1, 0], rotate: [0, 90], duration: 650, delay: anime.stagger(45), ease: 'outQuad' }, land - 40);
}

/** Tap to flip: restart the toss from the ground. @returns {boolean} whether the coin animated */
export function tossCoin() {
  if (!coinTimeline) return false;
  coinTimeline.restart();
  return true;
}

/** Stop the loop while the Overview tab is hidden. */
export function pauseCoin() {
  coinTimeline?.pause();
}
