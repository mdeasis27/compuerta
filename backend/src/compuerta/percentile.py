"""Percentile with linear interpolation (numpy 'linear' default) — mirrors
lib/compuerta/percentile.ts."""

from __future__ import annotations

import math


def percentile(sorted_ascending: list[float], q: float) -> float:
    n = len(sorted_ascending)
    if n == 0:
        return 0.0
    if n == 1:
        return sorted_ascending[0]
    rank = (q / 100.0) * (n - 1)
    lo = math.floor(rank)
    hi = math.ceil(rank)
    if lo == hi:
        return sorted_ascending[lo]
    frac = rank - lo
    return sorted_ascending[lo] + frac * (sorted_ascending[hi] - sorted_ascending[lo])


def p50(values: list[float]) -> float:
    return percentile(sorted(values), 50)


def p95(values: list[float]) -> float:
    return percentile(sorted(values), 95)


def p99(values: list[float]) -> float:
    return percentile(sorted(values), 99)
