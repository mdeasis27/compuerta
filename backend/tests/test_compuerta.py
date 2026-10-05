import json
from pathlib import Path

import pytest

from compuerta.breaker import error_rate, make_breaker, record, should_allow, tick, window_p95
from compuerta.errors import classify_error
from compuerta.percentile import percentile
from compuerta.prng import lcg_sequence
from compuerta.sim import simulate, simulate_baseline

FIXTURES = Path(__file__).parent / "fixtures"


def _load(name: str):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def _config():
    return _load("config.json")


def test_percentile_matches_fixture():
    for case in _load("percentiles.json")["cases"]:
        assert percentile(sorted(case["values"]), case["q"]) == pytest.approx(case["expected"], abs=1e-9)


def test_error_taxonomy_matches_fixture():
    for case in _load("errors.json")["cases"]:
        assert classify_error(case["message"]) == case["expected"]


def test_prng_matches_fixture():
    fixture = _load("prng.json")
    values = lcg_sequence(fixture["seed"], len(fixture["values"]))
    for got, expected in zip(values, fixture["values"]):
        assert got == pytest.approx(expected, abs=1e-12)


def test_breaker_state_machine():
    config = {"windowSize": 4, "errorThreshold": 0.25, "p95BudgetMs": 100, "cooldown": 10}
    b = make_breaker("p", config)
    assert record(b, {"ok": True, "latencyMs": 10}) is None
    assert record(b, {"ok": True, "latencyMs": 10}) is None
    assert record(b, {"ok": False, "latencyMs": 10}) is None
    assert record(b, {"ok": False, "latencyMs": 10}) == "trip"
    assert b["state"] == "open"
    assert error_rate(b) == pytest.approx(0.5, abs=1e-9)

    assert should_allow(b) is False
    for _ in range(config["cooldown"]):
        tick(b)
    assert b["state"] == "halfOpen"
    assert record(b, {"ok": True, "latencyMs": 10}) == "recover"
    assert b["state"] == "closed"


def test_breaker_trips_on_p95():
    config = {"windowSize": 4, "errorThreshold": 0.25, "p95BudgetMs": 100, "cooldown": 10}
    b = make_breaker("p", config)
    for _ in range(3):
        record(b, {"ok": True, "latencyMs": 200})
    assert window_p95(b) == 200
    assert record(b, {"ok": True, "latencyMs": 200}) == "trip"


def test_simulation_matches_fixture():
    fixture = _load("sim.json")
    config = _config()
    sim = simulate(config)
    baseline = simulate_baseline(config)

    assert sim["availability"] == pytest.approx(fixture["availability"], abs=1e-9)
    assert baseline["availability"] == pytest.approx(fixture["baselineAvailability"], abs=1e-9)
    assert sim["failoverEvents"] == fixture["failoverEvents"]
    assert sim["hedgedCalls"] == fixture["hedgedCalls"]
    assert sim["trips"]["falcon"] == fixture["tripsFalcon"]
    assert sim["finalBreakerStates"]["falcon"] == fixture["finalStateFalcon"]
    assert sim["totalCostCents"] == fixture["totalCostCents"]
    assert sim["costCentsByTenant"] == fixture["costCentsByTenant"]
    assert sim["costCentsByFeature"] == fixture["costCentsByFeature"]
    assert sum(sim["costCentsByTenant"].values()) == sim["totalCostCents"]
    assert sum(sim["costCentsByFeature"].values()) == sim["totalCostCents"]
