"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PlaybackFrame } from "@/design-system/demo/playback";
import type { TraceEvent } from "@/design-system/demo/types";
import { StoryStage } from "@/design-system/demo/decision-lab";
import { OutcomeTape, useReducedMotion } from "@/design-system/demo/project-story";
import { revealedTicks } from "@/design-system/demo/outcome-tape";
import type { SimResult } from "@/lib/compuerta/types";
import type { ExperienceInput } from "./adapter";
import { carRoutes, roadState, schedule, sceneLaunches, CRASH_X, ROAD_Y, SIDE_ROAD, TURN_X } from "./scene-state";
import { STORY } from "./story";

const CAR_FILL = { served: "fill-success", rerouted: "fill-info", lost: "fill-danger" } as const;

export function CompuertaScene({ frame, input, result, locale }: { frame: PlaybackFrame<TraceEvent>; input: ExperienceInput; result: SimResult; locale: "en" | "es" }) {
  const copy = STORY[locale].scene;
  const reduced = useReducedMotion();
  const revealed = revealedTicks(frame, result.nTicks, reduced);
  const routes = useMemo(() => carRoutes(result.servedBy), [result]);

  // Cars run on their own clock: the trace reveals them in bursts, the road lets them out one by one.
  const [clock, setClock] = useState<{ key: SimResult; launches: number[]; now: number }>({ key: result, launches: [], now: 0 });
  const launchesRef = useRef<{ key: SimResult; launches: number[] }>({ key: result, launches: [] });
  const settleNow = reduced || frame.complete;
  useEffect(() => {
    if (settleNow) return;
    let raf = 0;
    const step = (now: number) => {
      const prev = launchesRef.current.key === result ? launchesRef.current.launches : [];
      const launches = schedule(prev, revealed, now);
      launchesRef.current = { key: result, launches };
      setClock({ key: result, launches, now });
      if (!roadState(input, result, routes, launches, now).settled) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [input, result, routes, revealed, settleNow]);

  const launches = sceneLaunches(routes.length, clock.key === result ? clock.launches : [], settleNow);
  const s = roadState(input, result, routes, launches, settleNow ? 0 : clock.now);
  const message = s.message === "trip" ? (input.failover ? copy.messages.tripOn : copy.messages.tripOff) : copy.messages[s.message];

  return <StoryStage locale={locale} title={copy.title} caption={copy.caption} step={frame.visible} total={frame.total}>
    <p className="mb-3 flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
      <span aria-hidden="true" className="flex h-7 w-5 shrink-0 items-center justify-center rounded border border-muted-foreground"><span className="size-2 rounded-full border-2 border-foreground" /></span>
      <span className="min-w-0"><span className="block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{copy.mapLabel}</span><span aria-live="polite" data-map-message={s.message}>{message}</span></span>
    </p>
    <svg viewBox="0 0 480 290" role="img" aria-label={copy.ariaLabel(s.served, result.nTicks)} className="block h-auto w-full" data-road-scene data-settled={s.settled}>
      <rect x="256" y="22" width="218" height="66" rx="8" className="fill-none stroke-success/50" strokeDasharray="4 4" />
      <text x="260" y="16" fontSize="15" className="fill-muted-foreground">{copy.road.arrived}</text>
      <path d={`M0 ${ROAD_Y} H${TURN_X} V88`} className="fill-none stroke-foreground/15" strokeWidth="40" strokeLinejoin="round" />
      <path d={`M0 ${ROAD_Y} H${TURN_X}`} className="fill-none stroke-foreground/30" strokeDasharray="10 10" />
      <text x="6" y="102" fontSize="16" className="fill-muted-foreground">{copy.road.highway}</text>
      <g opacity={input.failover ? 1 : 0.45}>
        <path d={SIDE_ROAD} className="fill-none stroke-foreground/15" strokeWidth="30" strokeLinejoin="round" />
        <path d={SIDE_ROAD} className="fill-none stroke-foreground/30" strokeDasharray="10 10" />
        <text x="240" y="282" fontSize="16" textAnchor="middle" className="fill-muted-foreground">{copy.road.side}</text>
      </g>
      {input.failover ? null : <g>
        <rect x="196" y="228" width="88" height="24" rx="4" className="fill-background stroke-warning" />
        <text x="240" y="245" fontSize="14" textAnchor="middle" className="fill-warning">{copy.road.closed}</text>
      </g>}
      {s.crash === "none" ? null : <g opacity={s.crash === "active" ? 1 : 0.4} data-crash={s.crash}>
        <rect x={CRASH_X} y={ROAD_Y - 18} width="26" height="36" rx="4" className="fill-background stroke-danger" />
        <path d={`M${CRASH_X + 6} ${ROAD_Y - 10} l14 20 m0 -20 l-14 20`} className="stroke-danger" strokeWidth="3" />
        <text x={CRASH_X + 13} y={ROAD_Y + 40} fontSize="14" textAnchor="middle" className="fill-danger">{copy.road.crash}</text>
      </g>}
      {s.cars.map((c, i) => c.launched ? <g key={i} transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`} data-car={c.arrived ? c.kind : "driving"}>
        <rect x="-7" y="-4.5" width="14" height="9" rx="2" className={c.arrived ? CAR_FILL[c.kind] : "fill-foreground/60"} />
        {c.arrived && c.kind === "lost" ? <path d="M-3 -3 l6 6 m0 -6 l-6 6" className="stroke-white" strokeWidth="1.5" /> : null}
        {c.arrived && c.kind === "rerouted" ? <path d="M0 -4.5 v9" className="stroke-white" strokeWidth="2" /> : null}
      </g> : null)}
    </svg>
    <p className="mt-3 text-xs leading-5 text-muted-foreground">{copy.key}</p>
    <div className="mt-6">
      <OutcomeTape cells={s.cells} labels={copy.tape} ariaLabel={copy.tapeLabel} />
      <p className="mt-4 font-mono text-2xl font-semibold tracking-tight" data-served-count>{copy.servedOf(s.served, result.nTicks)}</p>
    </div>
  </StoryStage>;
}
