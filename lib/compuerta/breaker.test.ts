import { describe, expect, it } from "vitest";

import { errorRate, makeBreaker, record, shouldAllow, tick, windowP95 } from "./breaker";

const CONFIG = { windowSize: 4, errorThreshold: 0.25, p95BudgetMs: 100, cooldown: 10 };

describe("circuit breaker", () => {
  it("trips on error rate above threshold", () => {
    const b = makeBreaker("p", CONFIG);
    expect(record(b, { ok: true, latencyMs: 10 })).toBeNull();
    expect(record(b, { ok: true, latencyMs: 10 })).toBeNull();
    expect(record(b, { ok: false, latencyMs: 10 })).toBeNull();
    expect(record(b, { ok: false, latencyMs: 10 })).toBe("trip");
    expect(b.state).toBe("open");
    expect(errorRate(b)).toBeCloseTo(0.5, 10);
  });

  it("trips on p95 latency above budget even with zero errors", () => {
    const b = makeBreaker("p", CONFIG);
    record(b, { ok: true, latencyMs: 200 });
    record(b, { ok: true, latencyMs: 200 });
    record(b, { ok: true, latencyMs: 200 });
    expect(windowP95(b)).toBe(200);
    expect(record(b, { ok: true, latencyMs: 200 })).toBe("trip");
  });

  it("blocks traffic while open, then heals via a half-open probe", () => {
    const b = makeBreaker("p", CONFIG);
    record(b, { ok: false, latencyMs: 1 });
    record(b, { ok: false, latencyMs: 1 });
    record(b, { ok: false, latencyMs: 1 });
    record(b, { ok: false, latencyMs: 1 });
    expect(b.state).toBe("open");
    expect(shouldAllow(b)).toBe(false);

    for (let i = 0; i < CONFIG.cooldown; i += 1) tick(b);
    expect(b.state).toBe("halfOpen");
    expect(shouldAllow(b)).toBe(true);

    expect(record(b, { ok: true, latencyMs: 10 })).toBe("recover");
    expect(b.state).toBe("closed");
  });

  it("reopens immediately if a half-open probe fails", () => {
    const b = makeBreaker("p", CONFIG);
    record(b, { ok: false, latencyMs: 1 });
    record(b, { ok: false, latencyMs: 1 });
    record(b, { ok: false, latencyMs: 1 });
    record(b, { ok: false, latencyMs: 1 });
    for (let i = 0; i < CONFIG.cooldown; i += 1) tick(b);
    expect(b.state).toBe("halfOpen");
    expect(record(b, { ok: false, latencyMs: 1 })).toBe("reopen");
    expect(b.state).toBe("open");
  });
});
