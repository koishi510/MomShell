/** Random float in [lo, hi] */
export function rf(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo)
}
