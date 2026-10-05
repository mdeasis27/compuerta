"""Deterministic outage simulation — mirrors lib/compuerta/sim.ts."""

from __future__ import annotations

from .breaker import make_breaker, record, should_allow, tick
from .prng import lcg_factory


def simulate(config: dict) -> dict:
    maximum = 2**53 - 1
    for value in [p["costCentsPer1k"] for p in config["providers"]] + [c["tokens"] for c in config["classes"].values()]:
        if type(value) is not int or not 0 <= value <= maximum:
            raise ValueError("Rates and token counts must be nonnegative safe integers.")
    rng = lcg_factory(config["lcg"]["seed"], config["lcg"]["a"], config["lcg"]["c"], config["lcg"]["m"])
    providers = {p["id"]: p for p in config["providers"]}
    breakers = {p["id"]: make_breaker(p["id"], config["breaker"]) for p in config["providers"]}

    success = 0
    failover = 0
    hedged = 0
    total_cost = 0
    trips = {p["id"]: 0 for p in config["providers"]}
    cost_by_tenant = {t: 0 for t in config["tenants"]}
    cost_by_feature = {f: 0 for f in config["classes"]}
    events: list[dict] = []

    outage = config["outage"]

    def add_cost(provider_id: str, tokens: int, tenant: str, feature: str):
        nonlocal total_cost
        cost = (tokens * providers[provider_id]["costCentsPer1k"] + 999) // 1000
        if cost > maximum - total_cost:
            raise ValueError("Billing exceeds the safe integer range.")
        total_cost += cost
        cost_by_tenant[tenant] += cost
        cost_by_feature[feature] += cost

    def provider_response(p: dict, i: int) -> dict:
        err_draw = rng()
        lat_draw = rng()
        latency = p["baseLatencyMs"] + lat_draw * p["jitterMs"]
        if outage["provider"] == p["id"] and outage["startTick"] <= i < outage["endTick"]:
            return {"ok": False, "latencyMs": latency}
        return {"ok": err_draw >= p["errorRate"], "latencyMs": latency}

    for i in range(config["nTicks"]):
        for b in breakers.values():
            tick(b)

        feature = "cheap" if i % 2 == 0 else "long"
        cls = config["classes"][feature]
        tenant = config["tenants"][i % len(config["tenants"])]

        succeeded = False
        for provider_id in cls["preference"]:
            p = providers[provider_id]
            b = breakers[provider_id]
            if not should_allow(b):
                continue

            resp = provider_response(p, i)
            ev = record(b, {"ok": resp["ok"], "latencyMs": resp["latencyMs"]})
            if ev:
                events.append({"tick": i, "provider": provider_id, "kind": ev})

            if resp["ok"]:
                add_cost(provider_id, cls["tokens"], tenant, feature)
                succeeded = True

                if cls.get("hedged") and resp["latencyMs"] > cls.get("hedgeBudgetMs", float("inf")):
                    hedged += 1
                    hedge_provider = next((x for x in cls["preference"] if x != provider_id), None)
                    if hedge_provider:
                        add_cost(hedge_provider, cls["tokens"], tenant, feature)
                break

            failover += 1

        if succeeded:
            success += 1

    final_states = {p["id"]: breakers[p["id"]]["state"] for p in config["providers"]}
    for p in config["providers"]:
        trips[p["id"]] = sum(1 for e in events if e["provider"] == p["id"] and e["kind"] == "trip")

    return {
        "availability": success / config["nTicks"],
        "nTicks": config["nTicks"],
        "success": success,
        "failoverEvents": failover,
        "hedgedCalls": hedged,
        "trips": trips,
        "finalBreakerStates": final_states,
        "events": events,
        "totalCostCents": total_cost,
        "costCentsByTenant": cost_by_tenant,
        "costCentsByFeature": cost_by_feature,
    }


def simulate_baseline(config: dict) -> dict:
    rng = lcg_factory(config["lcg"]["seed"], config["lcg"]["a"], config["lcg"]["c"], config["lcg"]["m"])
    providers = {p["id"]: p for p in config["providers"]}
    outage = config["outage"]

    success = 0
    for i in range(config["nTicks"]):
        feature = "cheap" if i % 2 == 0 else "long"
        cls = config["classes"][feature]
        p = providers[cls["preference"][0]]
        err_draw = rng()
        rng()  # latency draw
        in_outage = outage["provider"] == p["id"] and outage["startTick"] <= i < outage["endTick"]
        errored = in_outage or err_draw < p["errorRate"]
        if not errored:
            success += 1
    return {"availability": success / config["nTicks"], "success": success, "nTicks": config["nTicks"]}
