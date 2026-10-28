import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { ANIME_URL } from '../src/js/config/constants.js';

const ROOT = new URL('..', import.meta.url).pathname;
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const externalTags = [...html.matchAll(/<(?:script|link)\b[^>]*>/g)]
  .map(([tag]) => tag)
  .filter((tag) => /^https?:/.test(attr(tag, 'src') ?? attr(tag, 'href') ?? ''));

test('no Tailwind Play CDN: styles come from the prebuilt stylesheet', () => {
  assert.doesNotMatch(html, /cdn\.tailwindcss\.com/);
  assert.match(html, /<link rel="stylesheet" href="src\/styles\/tailwind\.css"/);
});

test('every CDN script is version-pinned with SRI + CORS', () => {
  assert.ok(externalTags.length > 0);
  for (const tag of externalTags) {
    assert.match(attr(tag, 'integrity') ?? '', /^sha384-[A-Za-z0-9+/]{64}$/, tag);
    assert.equal(attr(tag, 'crossorigin'), 'anonymous', tag);
    assert.match(attr(tag, 'src') ?? attr(tag, 'href'), /@\d+\.\d+\.\d+\//, `pin an exact version: ${tag}`);
  }
});

test('the dynamically imported Anime.js is integrity-pinned in the import map', () => {
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
  const preload = externalTags.find((tag) => attr(tag, 'href') === ANIME_URL);
  assert.ok(preload, 'modulepreload must use ANIME_URL');
  assert.equal(map.integrity[ANIME_URL], attr(preload, 'integrity'));
});

test('the service worker runtime-caches every CDN host the page uses', () => {
  const hosts = new Set(externalTags.map((tag) => new URL(attr(tag, 'src') ?? attr(tag, 'href')).hostname));
  const cached = new Set([...sw.match(/const CDN_HOSTS = new Set\(\[([^\]]*)\]\)/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
  assert.deepEqual([...hosts].filter((h) => !cached.has(h)), []);
});
