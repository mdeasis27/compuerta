import { describe, expect, it } from "vitest";
import { simulate } from "./sim";
import type { SimConfig } from "./types";

function config(hedged = false): SimConfig {
  return {
    providers: ["primary", "backup"].map(id => ({ id, baseLatencyMs: 10, jitterMs: 0, errorRate: 0, costCentsPer1k: 1 })),
    classes: { cheap: { preference: ["primary", "backup"], hedged, hedgeBudgetMs: 0, tokens: 1 }, long: { preference: ["primary", "backup"], hedged, hedgeBudgetMs: 0, tokens: 1001 } },
    breaker: { windowSize: 3, errorThreshold: 1, p95BudgetMs: 100, cooldown: 3 },
    outage: { provider: "primary", startTick: 0, endTick: 0 }, tenants: ["one", "two"], nTicks: 2,
    lcg: { seed: 42, a: 1664525, c: 1013904223, m: 4294967296 },
  };
}

describe("integer-cent simulation billing", () => {
  it("rounds each billed call upward once and reconciles both breakdowns", () => {
    const result = simulate(config());
    expect(result.totalCostCents).toBe(3);
    expect(result.costCentsByTenant).toEqual({ one: 1, two: 2 });
    expect(result.costCentsByFeature).toEqual({ cheap: 1, long: 2 });
    expect(result).not.toHaveProperty("totalCost");
  });
  it("bills hedge calls with the same integer-cent rule", () => {
    const result = simulate(config(true));
    expect(result.hedgedCalls).toBe(2);
    expect(result.totalCostCents).toBe(6);
    expect(Object.values(result.costCentsByTenant).reduce((a, b) => a + b, 0)).toBe(6);
    expect(Object.values(result.costCentsByFeature).reduce((a, b) => a + b, 0)).toBe(6);
  });
  it("rejects fractional rates and token counts", () => {
    const rate = config(); rate.providers[0].costCentsPer1k = 0.5;
    expect(() => simulate(rate)).toThrow(/integer/);
    const tokens = config(); tokens.classes.cheap.tokens = 0.5;
    expect(() => simulate(tokens)).toThrow(/integer/);
  });
  it("does not bill failed attempts and bills only a successful fallback", () => {
    const input = config(); input.providers[0].errorRate = 1;
    input.providers[1].costCentsPer1k = 2;
    input.classes.cheap.preference = ["primary"];
    input.classes.long.preference = ["primary"];
    expect(simulate(input).totalCostCents).toBe(0);
    input.classes.cheap.preference.push("backup");
    input.classes.long.preference.push("backup");
    expect(simulate(input).totalCostCents).toBe(4);
  });
  it("rejects monetary totals beyond the safe integer range", () => {
    const input = config(); input.providers[0].costCentsPer1k = Number.MAX_SAFE_INTEGER;
    input.classes.long.tokens = 2000;
    expect(() => simulate(input)).toThrow(/safe integer/);
  });
});
