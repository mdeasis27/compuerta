import { describe, expect, it } from "vitest";

import configRaw from "./data/config.json";
import errorsFixture from "./fixtures/errors.json";
import percentilesFixture from "./fixtures/percentiles.json";
import prngFixture from "./fixtures/prng.json";
import simFixture from "./fixtures/sim.json";

import { classifyError } from "./errors";
import { percentile } from "./percentile";
import { lcgSequence } from "./prng";
import { getBaseline, getSimulation } from "./demo";
import type { SimConfig } from "./types";

const CONFIG = configRaw as SimConfig;

describe("pinned fixture: percentiles", () => {
  for (const c of percentilesFixture.cases as { values: number[]; q: number; expected: number }[]) {
    it(`percentile q=${c.q} on [${c.values}]`, () => {
      expect(percentile([...c.values].sort((a, b) => a - b), c.q)).toBeCloseTo(c.expected, 9);
    });
  }
});

describe("pinned fixture: error taxonomy", () => {
  for (const c of errorsFixture.cases as { message: string; expected: string }[]) {
    it(`classifies "${c.message}"`, () => {
      expect(classifyError(c.message)).toBe(c.expected);
    });
  }
});

describe("pinned fixture: prng", () => {
  it("reproduces the reference LCG sequence", () => {
    const values = lcgSequence(prngFixture.seed, prngFixture.values.length);
    values.forEach((v, i) => expect(v).toBeCloseTo(prngFixture.values[i], 12));
  });
});

describe("pinned fixture: simulation", () => {
  it("reproduces the reference outage result", () => {
    const sim = getSimulation();
    const baseline = getBaseline();
    expect(CONFIG.providers.length).toBe(3);
    expect(sim.availability).toBeCloseTo(simFixture.availability, 10);
    expect(baseline.availability).toBeCloseTo(simFixture.baselineAvailability, 10);
    expect(sim.failoverEvents).toBe(simFixture.failoverEvents);
    expect(sim.hedgedCalls).toBe(simFixture.hedgedCalls);
    expect(sim.trips.falcon).toBe(simFixture.tripsFalcon);
    expect(sim.finalBreakerStates.falcon).toBe(simFixture.finalStateFalcon);
    expect(sim.totalCost).toBeCloseTo(simFixture.totalCost, 3);
  });
});
