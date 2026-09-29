// lib/compuerta/demo.ts
// Wires the committed config into the deterministic simulation and exposes the
// numbers the dashboard shows. Runs fully offline.

import configRaw from "./data/config.json";
import { simulate, simulateBaseline } from "./sim";
import type { SimConfig } from "./types";

export const CONFIG: SimConfig = configRaw as SimConfig;

let memo: ReturnType<typeof simulate> | null = null;
let memoBaseline: ReturnType<typeof simulateBaseline> | null = null;

export function getSimulation() {
  if (!memo) memo = simulate(CONFIG);
  return memo;
}

export function getBaseline() {
  if (!memoBaseline) memoBaseline = simulateBaseline(CONFIG);
  return memoBaseline;
}

export function getAvailabilityDeltaPp() {
  return (getSimulation().availability - getBaseline().availability) * 100;
}

export function getProviders() {
  return CONFIG.providers;
}

export function getOutage() {
  return CONFIG.outage;
}

export function getAvailabilityPct() {
  return getSimulation().availability * 100;
}

export function getFailoverCount() {
  return getSimulation().failoverEvents;
}

export function getTrips() {
  return getSimulation().trips;
}

export function getHedgeOverheadPct() {
  const sim = getSimulation();
  // hedged calls add one extra provider cost on top of the primary call
  const primary = sim.nTicks;
  return (sim.hedgedCalls / primary) * 100;
}
