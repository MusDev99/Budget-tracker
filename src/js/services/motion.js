/**
 * Animation layer on top of Anime.js v4.
 *
 * The library is loaded lazily from the CDN so a blocked or slow CDN never breaks the app:
 * every helper degrades to "apply the final state instantly". Animations are also skipped
 * when the user prefers reduced motion.
 */
import { ANIME_URL, MOTION_LOAD_TIMEOUT_MS } from '../config/constants.js';

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

// ---------- Exits ----------

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

// ---------- SVG ----------

/**
 * World illustration: graticule lines draw themselves, the route arc draws,
 * then the plane flies the route on a loop and the destination pins pulse.
 */
export function playWorld(svg) {
  if (!svg) return;
  if (!isEnabled()) {
    svg.classList.add('is-static');
    return;
  }
  svg.classList.remove('is-static');

  const { animate, createDrawable, createMotionPath, remove, stagger } = anime;
  const globe = svg.querySelector('[data-world-globe]');
  const lines = svg.querySelectorAll('[data-world-line]');
  const route = svg.querySelector('[data-world-route]');
  const plane = svg.querySelector('[data-world-plane]');
  const pins = svg.querySelectorAll('[data-world-dot]');
  const pulses = svg.querySelectorAll('[data-world-pulse]');

  // Replaying (e.g. reopening the tab) must cancel the previous infinite loops first.
  remove([globe, ...lines, route, plane, ...pins, ...pulses]);

  animate(globe, { scale: { from: 0.85 }, opacity: { from: 0 }, duration: 700, ease: 'outExpo' });
  animate(createDrawable(lines), { draw: ['0 0', '0 1'], duration: 1200, delay: stagger(70, { start: 150 }), ease: 'inOutQuad' });
  animate(pins, { scale: { from: 0 }, duration: 500, delay: stagger(120, { start: 700 }), ease: 'outBack' });
  animate(createDrawable(route), { draw: ['0 0', '0 1'], duration: 1100, delay: 900, ease: 'inOutSine' });

  animate(plane, {
    ...createMotionPath(route),
    opacity: { from: 0, to: 1, duration: 300 },
    duration: 3600,
    delay: 1600,
    loop: true,
    loopDelay: 600,
    ease: 'inOutSine',
  });

  animate(pulses, {
    scale: [1, 2.6],
    opacity: [0.7, 0],
    duration: 1600,
    delay: stagger(400, { start: 1200 }),
    loop: true,
    ease: 'outQuad',
  });
}
