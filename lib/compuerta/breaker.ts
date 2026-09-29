// lib/compuerta/breaker.ts
// Circuit breaker state machine — closed / open / half-open. Trips on error
// rate or p95 latency over a sliding window; half-open probes are what make it
// self-healing. Mirrors backend/src/compuerta/breaker.py.

import { percentile } from "./percentile";
import type { BreakerConfig, ProviderState } from "./types";

export interface Outcome {
  ok: boolean;
  latencyMs: number;
}

export interface Breaker {
  id: string;
  state: ProviderState;
  window: Outcome[];
  cooldownRemaining: number;
  config: BreakerConfig;
}

export function makeBreaker(id: string, config: BreakerConfig): Breaker {
  return { id, state: "closed", window: [], cooldownRemaining: 0, config };
}

export function shouldAllow(b: Breaker): boolean {
  return b.state !== "open";
}

export function errorRate(b: Breaker): number {
  if (b.window.length === 0) return 0;
  const failures = b.window.filter((o) => !o.ok).length;
  return failures / b.window.length;
}

export function windowP95(b: Breaker): number {
  if (b.window.length === 0) return 0;
  return percentile(b.window.map((o) => o.latencyMs).sort((a, c) => a - c), 95);
}

/** Should the breaker trip given its current window? */
export function shouldTrip(b: Breaker): boolean {
  if (b.window.length < b.config.windowSize) return false;
  return errorRate(b) > b.config.errorThreshold || windowP95(b) > b.config.p95BudgetMs;
}

/** Record a request outcome. Returns "trip" | "recover" | "reopen" | null. */
export function record(b: Breaker, outcome: Outcome): "trip" | "recover" | "reopen" | null {
  b.window.push(outcome);
  if (b.window.length > b.config.windowSize) b.window = b.window.slice(-b.config.windowSize);

  if (b.state === "closed") {
    if (shouldTrip(b)) {
      b.state = "open";
      b.cooldownRemaining = b.config.cooldown;
      return "trip";
    }
    return null;
  }

  if (b.state === "halfOpen") {
    if (outcome.ok) {
      b.state = "closed";
      b.window = [outcome];
      return "recover";
    }
    b.state = "open";
    b.cooldownRemaining = b.config.cooldown;
    return "reopen";
  }

  return null;
}

/** Advance one tick. Open breakers count down toward half-open. */
export function tick(b: Breaker): void {
  if (b.state === "open") {
    b.cooldownRemaining -= 1;
    if (b.cooldownRemaining <= 0) b.state = "halfOpen";
  }
}
