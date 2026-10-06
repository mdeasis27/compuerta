import type { PlaybackFrame } from "@/design-system/demo/playback";
import type { TraceEvent } from "@/design-system/demo/types";
import { tapeCells, type TapeStatus } from "@/design-system/demo/outcome-tape";
import type { SimResult } from "@/lib/compuerta/types";
import type { ExperienceInput } from "./adapter";

/** Used when a run produced no breaker events: show the final result at once. */
export const COMPLETE_FRAME: PlaybackFrame<TraceEvent> = { visible: 0, total: 0, event: undefined, complete: true };

// Road geometry in SVG units (viewBox 480 x 290).
export const ROAD_Y = 130;
export const CRASH_X = 250;
export const TURN_X = 392;
export const SIDE_ROAD = "M110 130 L150 240 H330 L370 130";
export const GAP_MS = 150;
const SPEED = 0.4; // SVG units per ms

export type Pt = readonly [number, number];
export type CarKind = Exclude<TapeStatus, "pending">;
export type CarRoute = { kind: CarKind; route: Pt[]; length: number };
export type MapMessage = "clear" | "trip" | "reopen" | "recover";

const lengthOf = (pts: readonly Pt[]) => pts.slice(1).reduce((sum, [x, y], i) => sum + Math.hypot(x - pts[i][0], y - pts[i][1]), 0);

/** One car per request: the highway, the side road, or stuck behind the crash, exactly as the simulation served it. */
export function carRoutes(servedBy: readonly (string | null)[]): CarRoute[] {
  let parked = 0, stuck = 0;
  const start: Pt = [-20, ROAD_Y];
  return tapeCells(servedBy, "primary", servedBy.length).map(cell => {
    const kind = cell as CarKind;
    if (kind === "lost") {
      const k = stuck++;
      const route: Pt[] = [start, [CRASH_X - 22 - (k % 11) * 19, Math.floor(k / 11) % 2 ? ROAD_Y + 9 : ROAD_Y - 9]];
      return { kind, route, length: lengthOf(route) };
    }
    const p = parked++;
    const slot: Pt = [268 + (p % 10) * 20, 40 + Math.floor(p / 10) * 16];
    const detour: Pt[] = kind === "rerouted" ? [[110, ROAD_Y], [150, 240], [330, 240], [370, ROAD_Y]] : [];
    const route: Pt[] = [start, ...detour, [TURN_X, ROAD_Y], [TURN_X, 92], slot];
    return { kind, route, length: lengthOf(route) };
  });
}

export function pointAt(route: readonly Pt[], distance: number): Pt {
  let d = distance;
  for (let k = 1; k < route.length; k++) {
    const [x0, y0] = route[k - 1], [x1, y1] = route[k];
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (d <= len) return [x0 + ((x1 - x0) * d) / len, y0 + ((y1 - y0) * d) / len];
    d -= len;
  }
  return route[route.length - 1];
}

/** Launch time per revealed car: the trace reveals cars in bursts, the road lets them out one by one. */
export function schedule(prev: readonly number[], revealed: number, now: number): number[] {
  const launches = prev.slice(0, revealed);
  for (let i = launches.length; i < revealed; i++) launches.push(i === 0 ? now : Math.max(now, launches[i - 1] + GAP_MS));
  return launches;
}

export function roadState(input: ExperienceInput, result: SimResult, routes: readonly CarRoute[], launches: readonly number[], now: number) {
  const cars = launches.map((at, i) => {
    const { kind, route, length } = routes[i];
    const d = (now - at) * SPEED;
    const [x, y] = pointAt(route, Math.max(0, Math.min(d, length)));
    return { kind, x, y, launched: d >= 0, arrived: d >= length };
  });
  const launched = cars.filter(c => c.launched).length;
  const last = launched - 1;
  const event = result.events.filter(e => e.provider === "primary" && e.tick <= last).at(-1);
  const cells = routes.map((r, i): TapeStatus => (cars[i]?.arrived ? r.kind : "pending"));
  return {
    cars,
    launched,
    cells,
    served: cars.filter(c => c.arrived && c.kind !== "lost").length,
    crash: last < input.outageStart ? "none" as const : last < input.outageEnd ? "active" as const : "cleared" as const,
    message: (event?.kind ?? "clear") as MapMessage,
    settled: cars.every(c => c.arrived),
  };
}
