// lib/compuerta/percentile.ts
// Percentile with linear interpolation — the numpy default ('linear').
// Reference values are pinned in fixtures/percentiles.json. Mirrors
// backend/src/compuerta/percentile.py.

export function percentile(sortedAscending: readonly number[], q: number): number {
  const n = sortedAscending.length;
  if (n === 0) return 0;
  if (n === 1) return sortedAscending[0];
  const rank = (q / 100) * (n - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sortedAscending[lo];
  const frac = rank - lo;
  return sortedAscending[lo] + frac * (sortedAscending[hi] - sortedAscending[lo]);
}

export function p50(values: readonly number[]): number {
  return percentile([...values].sort((a, b) => a - b), 50);
}

export function p95(values: readonly number[]): number {
  return percentile([...values].sort((a, b) => a - b), 95);
}

export function p99(values: readonly number[]): number {
  return percentile([...values].sort((a, b) => a - b), 99);
}
