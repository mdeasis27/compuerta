// lib/compuerta/sim.ts
// Deterministic outage simulation. Three simulated providers, a seeded request
// stream, a real circuit-breaker state machine, and an injected outage. No
// network — the breaker is the actual logic, the providers are deterministic
// stand-ins. Mirrors backend/src/compuerta/sim.py.

import { makeBreaker, record, shouldAllow, tick, type Breaker } from "./breaker";
import { lcgFactory } from "./prng";
import type { ProviderConfig, ProviderState, SimConfig, SimResult } from "./types";

export function simulate(config: SimConfig): SimResult {
  const rng = lcgFactory(config.lcg.seed, config.lcg.a, config.lcg.c, config.lcg.m);

  const providers = new Map<string, ProviderConfig>(config.providers.map((p) => [p.id, p]));
  const breakers = new Map<string, Breaker>();
  for (const p of config.providers) breakers.set(p.id, makeBreaker(p.id, config.breaker));

  let success = 0;
  let failoverEvents = 0;
  let hedgedCalls = 0;
  let totalCost = 0;
  const trips: Record<string, number> = {};
  const costByTenant: Record<string, number> = {};
  const costByFeature: Record<string, number> = {};
  const events: SimResult["events"] = [];

  for (const t of config.tenants) costByTenant[t] = 0;
  for (const f of Object.keys(config.classes)) costByFeature[f] = 0;

  function providerResponse(p: ProviderConfig, i: number): { ok: boolean; latencyMs: number } {
    const errDraw = rng();
    const latDraw = rng();
    const latencyMs = p.baseLatencyMs + latDraw * p.jitterMs;
    if (config.outage.provider === p.id && i >= config.outage.startTick && i < config.outage.endTick) {
      return { ok: false, latencyMs };
    }
    return { ok: errDraw >= p.errorRate, latencyMs };
  }

  function addCost(providerId: string, tokens: number) {
    const p = providers.get(providerId)!;
    totalCost += (tokens / 1000) * p.costPer1k;
  }

  for (let i = 0; i < config.nTicks; i += 1) {
    for (const b of breakers.values()) tick(b);

    const feature = i % 2 === 0 ? "cheap" : "long";
    const cls = config.classes[feature];
    const tenant = config.tenants[i % config.tenants.length];

    let succeeded = false;

    for (const providerId of cls.preference) {
      const p = providers.get(providerId)!;
      const b = breakers.get(providerId)!;
      if (!shouldAllow(b)) continue;

      const { ok, latencyMs } = providerResponse(p, i);
      const event = record(b, { ok, latencyMs });
      if (event) events.push({ tick: i, provider: providerId, kind: event });

      if (ok) {
        addCost(providerId, cls.tokens);
        costByTenant[tenant] += (cls.tokens / 1000) * p.costPer1k;
        costByFeature[feature] += (cls.tokens / 1000) * p.costPer1k;
        succeeded = true;

        if (cls.hedged && latencyMs > (cls.hedgeBudgetMs ?? Number.POSITIVE_INFINITY)) {
          hedgedCalls += 1;
          const hedgeProvider = cls.preference.find((x) => x !== providerId);
          if (hedgeProvider) {
            const hp = providers.get(hedgeProvider)!;
            totalCost += (cls.tokens / 1000) * hp.costPer1k;
            costByTenant[tenant] += (cls.tokens / 1000) * hp.costPer1k;
            costByFeature[feature] += (cls.tokens / 1000) * hp.costPer1k;
          }
        }
        break;
      }

      failoverEvents += 1;
    }

    if (succeeded) success += 1;
  }

  const finalBreakerStates: Record<string, ProviderState> = {};
  for (const p of config.providers) {
    finalBreakerStates[p.id] = breakers.get(p.id)!.state;
    trips[p.id] = events.filter((e) => e.provider === p.id && e.kind === "trip").length;
  }

  return {
    availability: success / config.nTicks,
    nTicks: config.nTicks,
    success,
    failoverEvents,
    hedgedCalls,
    trips,
    finalBreakerStates,
    events,
    totalCost,
    costByTenant,
    costByFeature,
  };
}

/** Baseline: single-provider routing with no breaker and no failover. Every
 * request goes to the first preference in its class; an outage means those
 * requests simply fail. This is the "before" number the gateway improves on. */
export function simulateBaseline(config: SimConfig): { availability: number; success: number; nTicks: number } {
  const rng = lcgFactory(config.lcg.seed, config.lcg.a, config.lcg.c, config.lcg.m);
  const providers = new Map<string, ProviderConfig>(config.providers.map((p) => [p.id, p]));

  let success = 0;
  for (let i = 0; i < config.nTicks; i += 1) {
    const feature = i % 2 === 0 ? "cheap" : "long";
    const cls = config.classes[feature];
    const providerId = cls.preference[0];
    const p = providers.get(providerId)!;

    const errDraw = rng();
    const latDraw = rng();
    const latencyMs = p.baseLatencyMs + latDraw * p.jitterMs;
    void latencyMs;
    const inOutage = config.outage.provider === p.id && i >= config.outage.startTick && i < config.outage.endTick;
    const errored = inOutage || errDraw < p.errorRate;
    if (!errored) success += 1;
  }
  return { availability: success / config.nTicks, success, nTicks: config.nTicks };
}
