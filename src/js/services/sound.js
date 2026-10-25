/**
 * Coin sound effects, synthesised with the Web Audio API — no audio files to download or
 * cache, so they work offline in the installed app too.
 *
 * Browsers only allow audio after a user gesture, so the AudioContext is created lazily on
 * the first tap. Every function is a silent no-op when Web Audio is unavailable or muted.
 */
import { COIN_TOSS_MS } from '../config/constants.js';

const MASTER_VOLUME = 0.35;

let context = null;
let master = null;
let muted = false;

export const isSupported = () => Boolean(window.AudioContext || window.webkitAudioContext);

export function setMuted(value) {
  muted = Boolean(value);
}

function getContext() {
  if (muted || !isSupported()) return null;
  if (!context) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    context = new AudioCtx();
    master = context.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(context.destination);
  }
  if (context.state === 'suspended') context.resume();
  return context;
}

/** One sine/triangle partial with a near-instant attack and an exponential decay. */
function tone(ctx, { freq, at, duration, gain, type = 'sine', glideTo }) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, at + duration);

  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + 0.003);
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  osc.connect(env).connect(master);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

/** Short band-passed noise burst — the "tick" of metal on metal or a thumb flick. */
function noise(ctx, { at, duration, gain, freq }) {
  const length = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);

  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const env = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 1.2;
  env.gain.value = gain;

  source.connect(filter).connect(env).connect(master);
  source.start(at);
}

/** Thumb flick that launches the coin. */
function flick(ctx, at) {
  noise(ctx, { at, duration: 0.05, gain: 0.5, freq: 3500 });
  tone(ctx, { freq: 1900, glideTo: 700, at, duration: 0.06, gain: 0.18, type: 'triangle' });
}

/**
 * Metallic "ching": inharmonic partials (like a real coin) decaying at different rates,
 * on top of a bright transient.
 */
function ching(ctx, at, level = 1) {
  const base = 1760;
  const partials = [
    { ratio: 1, gain: 0.5, duration: 0.9 },
    { ratio: 2.32, gain: 0.32, duration: 0.6 },
    { ratio: 3.86, gain: 0.2, duration: 0.4 },
    { ratio: 5.17, gain: 0.12, duration: 0.25 },
  ];
  noise(ctx, { at, duration: 0.02, gain: 0.6 * level, freq: 6000 });
  partials.forEach(({ ratio, gain, duration }) =>
    tone(ctx, { freq: base * ratio, at, duration: duration * level, gain: gain * level }),
  );
}

/**
 * Full toss, scheduled on the audio clock so it lines up with the animation:
 * flick on launch → ching on landing → softer ching when the little hop touches down.
 */
export function playCoinToss() {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime + 0.01;
  const land = (COIN_TOSS_MS.air + COIN_TOSS_MS.fall) / 1000;
  flick(ctx, now);
  ching(ctx, now + land);
  ching(ctx, now + land + (2 * COIN_TOSS_MS.bounce) / 1000, 0.45);
}

/** Single ching — used when animations are off and the coin can't actually fly. */
export function playCoinChing() {
  const ctx = getContext();
  if (ctx) ching(ctx, ctx.currentTime + 0.01);
}
