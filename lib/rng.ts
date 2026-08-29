// Deterministic pseudo-randomness. The synthetic demo must come out identical
// on every machine that runs it, so nothing here may touch Math.random.

export type Rng = {
  next(): number
  uniform(min: number, max: number): number
  int(min: number, max: number): number
  pick<T>(items: readonly T[]): T
  normal(mean: number, sd: number): number
}

// xorshift32, seeded. Small, fast, and repeatable across machines.
export function createRng(seed: number): Rng {
  // A zero state locks xorshift into returning one value forever, so start
  // from the golden-ratio constant instead of trusting the caller's seed.
  let state = (seed | 0) || 0x9e3779b9

  const next = () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 0x100000000
  }

  const uniform = (min: number, max: number) => min + next() * (max - min)

  // Inclusive of both bounds, unlike the half-open next().
  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min

  const pick = <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)]

  // Box-Muller. u must be non-zero or the log diverges.
  const normal = (mean: number, sd: number) => {
    let u = 0
    while (u === 0) u = next()
    const v = next()
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }

  return { next, uniform, int, pick, normal }
}
