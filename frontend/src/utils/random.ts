// Seeded PRNG (mulberry32) for deterministic visual randomness.
// Satisfies static analysis rule S2245 — no security context here,
// all callers use this for cosmetic positioning/animation.
export function createSeededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random float in [lo, hi] using the given PRNG */
export function rf(rand: () => number, lo: number, hi: number): number {
  return lo + rand() * (hi - lo);
}
