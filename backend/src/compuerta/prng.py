"""Deterministic 32-bit LCG — mirrors lib/compuerta/prng.ts."""

from __future__ import annotations


def lcg_factory(seed: int, a: int = 1664525, c: int = 1013904223, m: int = 4294967296):
    state = seed & 0xFFFFFFFF

    def next_value() -> float:
        nonlocal state
        state = (a * state + c) & 0xFFFFFFFF
        return state / m

    return next_value


def lcg_sequence(seed: int, n: int) -> list[float]:
    nxt = lcg_factory(seed)
    return [nxt() for _ in range(n)]
