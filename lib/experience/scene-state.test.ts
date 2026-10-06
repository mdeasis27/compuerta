import { expect, test } from "vitest";
import { runExperience } from "./adapter";
import { COMPLETE_FRAME, carRoutes, roadState, schedule, GAP_MS, ROAD_Y, CRASH_X } from "./scene-state";
import { revealedTicks, tapeCells } from "@/design-system/demo/outcome-tape";

const signal = new AbortController().signal;
const run = async (outageEnd: number, failover: boolean) => {
  const input = { outageStart: 8, outageEnd, failover, hedge: false };
  return { input, result: (await runExperience(input, signal, () => {})).result.protected };
};
const allArrived = (n: number) => Array<number>(n).fill(-Infinity);

test("cars are launched in order, a gap apart, and only once revealed", () => {
  expect(schedule([], 3, 1000)).toEqual([1000, 1000 + GAP_MS, 1000 + 2 * GAP_MS]);
  expect(schedule([1000, 1150], 3, 5000)).toEqual([1000, 1150, 5000]);
  expect(schedule([1000, 1150, 1300], 1, 5000)).toEqual([1000]);
});

test("each car's route follows what the simulation says happened to that request", async () => {
  const { result } = await run(20, true);
  const routes = carRoutes(result.servedBy);
  expect(routes.map(r => r.kind)).toEqual(tapeCells(result.servedBy, "primary", 30));
  for (const r of routes) {
    const end = r.route.at(-1)!;
    const usesSideRoad = r.route.some(([, y]) => y > ROAD_Y + 50);
    expect(usesSideRoad, r.kind).toBe(r.kind === "rerouted");
    if (r.kind === "lost") expect(end[0]).toBeLessThan(CRASH_X);
    else expect(end[1]).toBeLessThan(ROAD_Y);
  }
  const ends = routes.filter(r => r.kind !== "lost").map(r => r.route.at(-1)!.join(","));
  expect(new Set(ends).size).toBe(ends.length);
});

test("once every car arrives the count, tape and crash match the simulation", async () => {
  for (const failover of [true, false]) {
    const { input, result } = await run(20, failover);
    const s = roadState(input, result, carRoutes(result.servedBy), allArrived(30), 0);
    expect(s.served).toBe(result.success);
    expect(s.cells).toEqual(tapeCells(result.servedBy, "primary", 30));
    expect(s.crash).toBe("cleared");
    expect(s.settled).toBe(true);
    expect(s.message).toBe(result.events.filter(e => e.provider === "primary").at(-1)?.kind ?? "clear");
  }
});

test("without the backup nobody takes the side road and the outage loses customers", async () => {
  const { input, result } = await run(20, false);
  const s = roadState(input, result, carRoutes(result.servedBy), allArrived(30), 0);
  expect(s.cells.includes("rerouted")).toBe(false);
  expect(s.cells.filter(c => c === "lost").length).toBeGreaterThan(0);
});

test("mid-run the crash is active, the maps app reports it and cars still driving are not counted", async () => {
  const { input, result } = await run(20, true);
  const routes = carRoutes(result.servedBy);
  const launches = schedule([], 12, 0);
  const now = launches[11];
  const s = roadState(input, result, routes, launches, now);
  expect(s.launched).toBe(12);
  expect(s.crash).toBe("active");
  expect(s.message).toBe("trip");
  expect(s.settled).toBe(false);
  expect(s.cells[11]).toBe("pending");
  expect(s.served).toBeLessThan(12);
});

test("an outage too short to trip the breaker still shows the full result", async () => {
  const input = { outageStart: 8, outageEnd: 10, failover: true, hedge: false };
  const r = await runExperience(input, signal, () => {});
  const frame = r.trace.length === 0 ? COMPLETE_FRAME : { total: r.trace.length, complete: true, event: r.trace.at(-1) };
  const revealed = revealedTicks(frame, 30);
  expect(revealed).toBe(30);
  const s = roadState(input, r.result.protected, carRoutes(r.result.protected.servedBy), allArrived(revealed), 0);
  expect(s.cells.includes("pending")).toBe(false);
});
