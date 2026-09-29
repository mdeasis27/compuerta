# Compuerta

**Self-healing LLM gateway** — circuit breakers per provider (closed/open/half-open),
automatic failover by request class, hedged requests for latency-sensitive traffic, and
cost attribution by tenant and feature.

> **Result:** **100% availability (300/300)** sustained through a 60-tick outage of the
> primary provider, vs **89.7% without failover** (**+10.3pp**). The breaker tripped once,
> rerouted **11 requests**, re-probed 4 times during the outage (correctly rejected), and
> closed itself on recovery — no operator intervention.

---

## Result

### Availability through a simulated outage (300 requests, 3 providers)

| Scenario | Availability | Requests saved |
|---|---|---|
| Single provider, no failover | 89.7% (269/300) | — |
| **Gateway (breaker + failover)** | **100% (300/300)** | **31** |

The outage takes down `falcon` (the primary "long" class provider) for ticks 100–160.
Without a gateway, every "long" request in that window fails. With the gateway:

1. **tick 111** — the breaker trips on `falcon`'s error rate (100% > 25% threshold over a
   20-request window).
2. **ticks 121–151** — the breaker goes half-open every cooldown and probes; each probe
   fails (the provider is still down) and it reopens. 4 reopen events.
3. **tick 161** — the outage ends; the next half-open probe succeeds and the breaker closes.
4. Throughout, "long" requests reroute to `heron`/`osprey` — **11 failover events**, zero
   user-visible failures.

### Circuit breaker

- **Trip on** error rate > 25% or p95 latency > 120ms over a 20-request sliding window.
- **Half-open probes** are the self-healing mechanism: a small fraction of traffic returns
  to a recovering provider; success closes the breaker, failure reopens it immediately.

### Hedged requests (documented overcost)

**89 of 150** "long" calls exceeded the 70ms hedge budget, each firing a second provider
(≈2× spend on that subset). Hedging is the price of a guaranteed p95 tail; the demo reports
it rather than hiding it. Total cost with hedges: **$164.83**.

### Cost attribution

| Tenant | Cost | | Feature | Cost |
|---|---|---|---|---|
| acme | $53.76 | | cheap | $14.35 |
| beta | $55.20 | | long | $150.48 |
| gamma | $55.87 | | | |

---

## Architecture

```
lib/compuerta/          # canonical core (TypeScript, tested)
  prng.ts               #   deterministic 32-bit LCG (identical in both languages)
  percentile.ts         #   p50/p95/p99 (numpy linear method)
  errors.ts             #   deterministic error taxonomy
  breaker.ts            #   closed/open/half-open state machine
  sim.ts                #   seeded outage simulation + baseline (no failover)
  demo.ts               #   wires config → simulation → numbers
  data/config.json      #   providers, classes, breaker, outage (committed)
  fixtures/             #   percentiles/errors/prng/sim.json (shared math, pinned)
backend/                # same math in Python + pytest (authoritative)
  src/compuerta/        #   prng/percentile/errors/breaker/sim.py
  tests/                #   pinned to tests/fixtures/*.json
app/                    # Next.js landing + demo dashboard (Vercel, demo mode)
```

The breaker is the **real logic**; the providers are deterministic stand-ins. The whole
simulation is reproducible because the PRNG, percentiles, taxonomy, and state machine are
identical in TypeScript and Python (pinned by shared fixtures).

## Design decisions & tradeoffs

1. **The breaker runs the real state machine, not a chart.** The demo could have hardcoded a
   "trip → reroute → recover" timeline, but then the failover logic would be unproven. Here
   the trip/reopen/recover events are *emergent* from the state machine over a seeded stream.
2. **Failover preference lists differ by class.** A cheap classification call fails over
   differently than a long generation call. The demo encodes this: `cheap` prefers `heron`
   first (fast/cheap), `long` prefers `falcon` (quality) then hedges on latency.
3. **Hedging is a cost, reported honestly.** Firing a second provider roughly doubles spend
   on the hedged subset. The demo surfaces the overcost instead of pretending hedging is free.

## What did not work

- **Availability is 100% because failover always had a healthy provider.** With three
  providers and one outage, the gateway absorbs it perfectly. A correlated multi-provider
  outage, or a degraded-queue path for deferrable work, is where availability would dip —
  that path is out of scope for this demo and documented as the next layer.

## Run it

```bash
# frontend demo + TS tests
pnpm install && pnpm dev      # http://localhost:3000
pnpm test                     # 28 vitest tests

# backend (authoritative math) — Python 3.12+
cd backend && uv sync --extra dev && uv run pytest   # 6 tests, pinned fixtures
```

## Stack

Next.js 16 · TypeScript · Vitest · Tailwind v4 · Python 3.13 · pytest
