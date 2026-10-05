import { simulate, simulateBaseline } from "@/lib/compuerta/sim";
import type { SimConfig } from "@/lib/compuerta/types";
import type { DemoAdapter, TraceEvent } from "./types";

export type ExperienceInput = { outageStart: number; outageEnd: number; failover: boolean; hedge: boolean };
export type ExperienceResult = { protected: ReturnType<typeof simulate>; baseline: ReturnType<typeof simulateBaseline> };
const configFor = (input: ExperienceInput): SimConfig => ({ providers: [{ id: "primary", baseLatencyMs: 250, jitterMs: 40, errorRate: 0.01, costCentsPer1k: 20 }, { id: "backup", baseLatencyMs: 330, jitterMs: 50, errorRate: 0.01, costCentsPer1k: 25 }], classes: { cheap: { preference: input.failover ? ["primary", "backup"] : ["primary"], hedged: input.hedge, hedgeBudgetMs: 280, tokens: 200 }, long: { preference: input.failover ? ["primary", "backup"] : ["primary"], hedged: input.hedge, hedgeBudgetMs: 280, tokens: 700 } }, breaker: { windowSize: 3, errorThreshold: 0.4, p95BudgetMs: 500, cooldown: 3 }, outage: { provider: "primary", startTick: input.outageStart, endTick: input.outageEnd }, tenants: ["operations", "support"], nTicks: 30, lcg: { seed: 42, a: 1664525, c: 1013904223, m: 4294967296 } });
export const runExperience: DemoAdapter<ExperienceInput, ExperienceResult> = async (input, signal, onEvent) => {
  const startedAt = performance.now();
  if (input.outageStart >= input.outageEnd) throw new Error("The outage must have a positive duration.");
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const config = configFor(input); const protectedResult = simulate(config); const baseline = simulateBaseline(config);
  const trace: TraceEvent[] = protectedResult.events.map((event, index) => ({ id: `${event.provider}-${event.tick}`, step: index + 1, kind: "breaker", messageKey: event.kind, timestampMs: performance.now() - startedAt, evidenceIds: [event.provider, `tick:${event.tick}`] }));
  for (const event of trace) { if (signal.aborted) throw new DOMException("Aborted", "AbortError"); onEvent(event); if (signal.aborted) throw new DOMException("Aborted", "AbortError"); } return { input, result: { protected: protectedResult, baseline }, trace, executionMs: performance.now() - startedAt, mode: "simulation" };
};
