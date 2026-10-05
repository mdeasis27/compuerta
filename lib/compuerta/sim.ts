// lib/compuerta/sim.ts
// Deterministic outage simulation. Three simulated providers, a seeded request
// stream, a real circuit-breaker state machine, and an injected outage. No
// network — the breaker is the actual logic, the providers are deterministic
// stand-ins. Mirrors backend/src/compuerta/sim.py.

import { makeBreaker, record, shouldAllow, tick, type Breaker } from "./breaker";
import { lcgFactory } from "./prng";
import type { ProviderConfig, ProviderState, SimConfig, SimResult } from "./types";

export function simulate(config: SimConfig): SimResult {
  for (const provider of config.providers) {
    if (!Number.isSafeInteger(provider.costCentsPer1k) || provider.costCentsPer1k < 0) throw new Error("Rates must be nonnegative safe integer cents.");
  }
  for (const cls of Object.values(config.classes)) {
    if (!Number.isSafeInteger(cls.tokens) || cls.tokens < 0) throw new Error("Token counts must be nonnegative safe integers.");
  }
  const rng = lcgFactory(config.lcg.seed, config.lcg.a, config.lcg.c, config.lcg.m);

  const providers = new Map<string, ProviderConfig>(config.providers.map((p) => [p.id, p]));
  const breakers = new Map<string, Breaker>();
  for (const p of config.providers) breakers.set(p.id, makeBreaker(p.id, config.breaker));

  let success = 0;
  let failoverEvents = 0;
  let hedgedCalls = 0;
  let totalCostCents = 0;
  const trips: Record<string, number> = {};
  const costCentsByTenant: Record<string, number> = {};
  const costCentsByFeature: Record<string, number> = {};
  const events: SimResult["events"] = [];

  for (const t of config.tenants) costCentsByTenant[t] = 0;
  for (const f of Object.keys(config.classes)) costCentsByFeature[f] = 0;

  function providerResponse(p: ProviderConfig, i: number): { ok: boolean; latencyMs: number } {
    const errDraw = rng();
    const latDraw = rng();
    const latencyMs = p.baseLatencyMs + latDraw * p.jitterMs;
    if (config.outage.provider === p.id && i >= config.outage.startTick && i < config.outage.endTick) {
      return { ok: false, latencyMs };
    }
    return { ok: errDraw >= p.errorRate, latencyMs };
  }

  function addCost(providerId: string, tokens: number, tenant: string, feature: string) {
    const p = providers.get(providerId)!;
    // Illustrative billing: round each successful or hedged call upward once.
    // Exact integer division avoids fractional monetary intermediates.
    const cents = (BigInt(tokens) * BigInt(p.costCentsPer1k) + BigInt(999)) / BigInt(1000);
    if (cents > BigInt(Number.MAX_SAFE_INTEGER - totalCostCents)) throw new Error("Billing exceeds the safe integer range.");
    const costCents = Number(cents);
    totalCostCents += costCents;
    costCentsByTenant[tenant] += costCents;
    costCentsByFeature[feature] += costCents;
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
        addCost(providerId, cls.tokens, tenant, feature);
        succeeded = true;

        if (cls.hedged && latencyMs > (cls.hedgeBudgetMs ?? Number.POSITIVE_INFINITY)) {
          hedgedCalls += 1;
          const hedgeProvider = cls.preference.find((x) => x !== providerId);
          if (hedgeProvider) {
            addCost(hedgeProvider, cls.tokens, tenant, feature);
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
    totalCostCents,
    costCentsByTenant,
    costCentsByFeature,
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
