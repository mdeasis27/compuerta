// lib/compuerta/prng.ts
// Deterministic 32-bit LCG (Numerical Recipes constants) — identical in TS and
// Python, so the whole outage simulation is reproducible across languages.
// Mirrors backend/src/compuerta/prng.py.

export function lcgFactory(seed: number, a = 1664525, c = 1013904223, m = 4294967296): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(a, state) + c) >>> 0;
    return state / m;
  };
}

export function lcgSequence(seed: number, n: number): number[] {
  const next = lcgFactory(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) out.push(next());
  return out;
}
