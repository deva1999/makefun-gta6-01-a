'use strict';
/* Seeded RNG (mulberry32) so ?seed=<n> builds a deterministic city. */
window.NT = window.NT || {};
NT.makeRng = function (seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
NT.seedFromUrl = function () {
  const raw = new URLSearchParams(location.search).get('seed');
  const n = raw === null ? 7 : Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : 7;
};
NT.rngRange = function (rng, lo, hi) { return lo + rng() * (hi - lo); };
NT.rngPick = function (rng, arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; };
