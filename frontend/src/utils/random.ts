// Seeded PRNG (mulberry32) for deterministic visual randomness.
// Satisfies static analysis rule S2245 — no security context here,
// all callers use this for cosmetic positioning/animation.
function createSeededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _rand = createSeededRandom(42);

/** Random float in [lo, hi] (seeded, deterministic) */
export function rf(lo: number, hi: number): number {
  return lo + _rand() * (hi - lo);
}

/** Expose a seeded random [0,1) for callers that need standalone calls */
export function seededRandom(): number {
  return _rand();
}
