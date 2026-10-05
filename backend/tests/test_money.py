"""Exact billing regression checks; also runnable with standard-library unittest."""

import json
from pathlib import Path
import unittest

from compuerta.sim import simulate


def config():
    return {
        "providers": [{"id": name, "baseLatencyMs": 10, "jitterMs": 0, "errorRate": 0, "costCentsPer1k": 1} for name in ["primary", "backup"]],
        "classes": {name: {"preference": ["primary", "backup"], "hedged": False, "hedgeBudgetMs": 0, "tokens": tokens} for name, tokens in [("cheap", 1), ("long", 1001)]},
        "breaker": {"windowSize": 3, "errorThreshold": 1, "p95BudgetMs": 100, "cooldown": 3},
        "outage": {"provider": "primary", "startTick": 0, "endTick": 0},
        "tenants": ["one", "two"], "nTicks": 2,
        "lcg": {"seed": 42, "a": 1664525, "c": 1013904223, "m": 4294967296},
    }


class BillingTests(unittest.TestCase):
    def test_rounding_and_hedges(self):
        input_config = config()
        for hedged, expected in [(False, 3), (True, 6)]:
            for value in input_config["classes"].values():
                value["hedged"] = hedged
            result = simulate(input_config)
            self.assertEqual(result["totalCostCents"], expected)
            self.assertEqual(sum(result["costCentsByTenant"].values()), expected)
            self.assertEqual(sum(result["costCentsByFeature"].values()), expected)

    def test_failed_attempts_and_fallback(self):
        input_config = config()
        input_config["providers"][0]["errorRate"] = 1
        input_config["providers"][1]["costCentsPer1k"] = 2
        for value in input_config["classes"].values():
            value["preference"] = ["primary"]
        self.assertEqual(simulate(input_config)["totalCostCents"], 0)
        for value in input_config["classes"].values():
            value["preference"].append("backup")
        self.assertEqual(simulate(input_config)["totalCostCents"], 4)

    def test_invalid_rates_and_overflow(self):
        input_config = config()
        input_config["providers"][0]["costCentsPer1k"] = 0.5
        with self.assertRaisesRegex(ValueError, "integer"):
            simulate(input_config)
        input_config["providers"][0]["costCentsPer1k"] = 2**53 - 1
        input_config["classes"]["long"]["tokens"] = 2000
        with self.assertRaisesRegex(ValueError, "safe integer"):
            simulate(input_config)

    def test_pinned_reference_and_config_parity(self):
        fixtures = Path(__file__).parent / "fixtures"
        ts_root = fixtures.parents[2] / "lib" / "compuerta"
        input_config = json.loads((fixtures / "config.json").read_text())
        self.assertEqual(input_config, json.loads((ts_root / "data" / "config.json").read_text()))
        reference = json.loads((fixtures / "sim.json").read_text())
        self.assertEqual(reference, json.loads((ts_root / "fixtures" / "sim.json").read_text()))
        result = simulate(input_config)
        for key in ["totalCostCents", "costCentsByTenant", "costCentsByFeature", "availability", "failoverEvents", "hedgedCalls"]:
            self.assertEqual(result[key], reference[key])


if __name__ == "__main__":
    unittest.main()
