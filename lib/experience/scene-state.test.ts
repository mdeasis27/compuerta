import { expect, test } from "vitest";
import { runExperience } from "./adapter";
import { sceneState, COMPLETE_FRAME } from "./scene-state";
import { revealedTicks } from "@/design-system/demo/outcome-tape";

const signal = new AbortController().signal;

test("fully revealed tape matches the simulation's served count", async () => {
  const input = { outageStart: 8, outageEnd: 20, failover: true, hedge: false };
  const { result } = await runExperience(input, signal, () => {});
  const s = sceneState(input, result.protected, 30);
  expect(s.cells).toHaveLength(30);
  expect(s.cells.filter(c => c !== "lost").length).toBe(result.protected.success);
  expect(s.served).toBe(result.protected.success);
  expect(s.cells.some(c => c === "rerouted")).toBe(true);
});

test("without backup nothing is rerouted", async () => {
  const input = { outageStart: 8, outageEnd: 20, failover: false, hedge: false };
  const { result } = await runExperience(input, signal, () => {});
  expect(sceneState(input, result.protected, 30).cells.includes("rerouted")).toBe(false);
});

test("mid-outage the main provider is down and the packet takes the backup when failover is on", async () => {
  const input = { outageStart: 8, outageEnd: 20, failover: true, hedge: false };
  const { result } = await runExperience(input, signal, () => {});
  const s = sceneState(input, result.protected, 15);
  expect(s.primaryDown).toBe(true);
  expect(s.packetOn).toBe("backup");
});

test("an outage too short to trip the breaker still shows the full result", async () => {
  const input = { outageStart: 8, outageEnd: 10, failover: true, hedge: false };
  const run = await runExperience(input, signal, () => {});
  const frame = run.trace.length === 0 ? COMPLETE_FRAME : { total: run.trace.length, complete: true, event: run.trace.at(-1) };
  expect(revealedTicks(frame, 30)).toBe(30);
  expect(sceneState(input, run.result.protected, revealedTicks(frame, 30)).cells.includes("pending")).toBe(false);
});
