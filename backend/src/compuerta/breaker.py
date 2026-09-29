"""Circuit breaker state machine — mirrors lib/compuerta/breaker.ts.

Breakers are plain mutable dicts: {"id", "state", "window", "cooldownRemaining",
"config"} so the TS and Python implementations stay structurally identical.
"""

from __future__ import annotations

from .percentile import percentile


def make_breaker(breaker_id: str, config: dict) -> dict:
    return {
        "id": breaker_id,
        "state": "closed",
        "window": [],
        "cooldownRemaining": 0,
        "config": config,
    }


def should_allow(b: dict) -> bool:
    return b["state"] != "open"


def error_rate(b: dict) -> float:
    if not b["window"]:
        return 0.0
    failures = sum(1 for o in b["window"] if not o["ok"])
    return failures / len(b["window"])


def window_p95(b: dict) -> float:
    if not b["window"]:
        return 0.0
    return percentile(sorted(o["latencyMs"] for o in b["window"]), 95)


def should_trip(b: dict) -> bool:
    if len(b["window"]) < b["config"]["windowSize"]:
        return False
    return error_rate(b) > b["config"]["errorThreshold"] or window_p95(b) > b["config"]["p95BudgetMs"]


def record(b: dict, outcome: dict) -> str | None:
    b["window"].append(outcome)
    if len(b["window"]) > b["config"]["windowSize"]:
        b["window"] = b["window"][-b["config"]["windowSize"]:]

    if b["state"] == "closed":
        if should_trip(b):
            b["state"] = "open"
            b["cooldownRemaining"] = b["config"]["cooldown"]
            return "trip"
        return None

    if b["state"] == "halfOpen":
        if outcome["ok"]:
            b["state"] = "closed"
            b["window"] = [outcome]
            return "recover"
        b["state"] = "open"
        b["cooldownRemaining"] = b["config"]["cooldown"]
        return "reopen"

    return None


def tick(b: dict) -> None:
    if b["state"] == "open":
        b["cooldownRemaining"] -= 1
        if b["cooldownRemaining"] <= 0:
            b["state"] = "halfOpen"
