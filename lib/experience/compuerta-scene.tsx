"use client";
import type { PlaybackFrame } from "@/design-system/demo/playback";
import type { TraceEvent } from "@/design-system/demo/types";
import { StoryStage } from "@/design-system/demo/decision-lab";
import { OutcomeTape, useReducedMotion } from "@/design-system/demo/project-story";
import { revealedTicks } from "@/design-system/demo/outcome-tape";
import type { SimResult } from "@/lib/compuerta/types";
import type { ExperienceInput } from "./adapter";
import { sceneState } from "./scene-state";
import { STORY } from "./story";

const NODES = { clients: { x: 10, y: 95 }, gateway: { x: 230, y: 95 }, primary: { x: 470, y: 20 }, backup: { x: 470, y: 170 } } as const;
const W = 150, H = 70;

export function CompuertaScene({ frame, input, result, locale }: { frame: PlaybackFrame<TraceEvent>; input: ExperienceInput; result: SimResult; locale: "en" | "es" }) {
  const copy = STORY[locale].scene;
  const reduced = useReducedMotion();
  const revealed = revealedTicks(frame, result.nTicks, reduced);
  const s = sceneState(input, result, revealed);
  const target = s.packetOn === "backup" ? NODES.backup : NODES.primary;
  const packet = s.packetOn === "none" ? { x: NODES.gateway.x + W / 2, y: NODES.gateway.y + H / 2 } : { x: target.x - 12, y: target.y + H / 2 };
  const node = (key: keyof typeof NODES, tone: string) => {
    const { x, y } = NODES[key]; const n = copy.nodes[key];
    return <g key={key}>
      <rect x={x} y={y} width={W} height={H} rx="10" className={`stroke-2 transition-colors duration-500 motion-reduce:transition-none ${tone}`} />
      <text x={x + W / 2} y={y + 24} textAnchor="middle" className="fill-foreground text-[14px] font-semibold">{n.name}</text>
      <text x={x + W / 2} y={y + 42} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px] uppercase">{n.sub}</text>
      <text x={x + W / 2} y={y + 60} textAnchor="middle" className="fill-accent text-[11px]">= {n.analogy}</text>
    </g>;
  };
  return <StoryStage locale={locale} title={copy.title} caption={copy.caption} step={frame.visible} total={frame.total}>
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={copy.title}>
      <svg role="img" aria-label={copy.servedOf(s.served, result.nTicks)} viewBox="0 0 640 260" className="h-auto w-full min-w-[520px]">
        <path d={`M${NODES.clients.x + W} ${NODES.clients.y + H / 2}H${NODES.gateway.x}`} className="stroke-border" strokeWidth="2" />
        <path d={`M${NODES.gateway.x + W} ${NODES.gateway.y + H / 2}L${NODES.primary.x} ${NODES.primary.y + H / 2}`} className={s.primaryDown ? "stroke-danger" : "stroke-border"} strokeWidth="2" strokeDasharray={s.primaryDown ? "6 6" : undefined} />
        <path d={`M${NODES.gateway.x + W} ${NODES.gateway.y + H / 2}L${NODES.backup.x} ${NODES.backup.y + H / 2}`} className={input.failover ? "stroke-success" : "stroke-border"} strokeWidth="2" strokeDasharray={input.failover ? undefined : "2 6"} />
        {node("clients", "fill-surface stroke-border")}
        {node("gateway", "fill-accent/10 stroke-accent")}
        {node("primary", s.primaryDown ? "fill-danger/15 stroke-danger" : "fill-surface stroke-border")}
        {node("backup", input.failover ? "fill-success/10 stroke-success" : "fill-surface stroke-border opacity-50")}
        <circle cx={packet.x} cy={packet.y} r="8" className="fill-accent transition-all duration-500 motion-reduce:transition-none" />
      </svg>
    </div>
    <div className="mt-6">
      <OutcomeTape cells={s.cells} labels={copy.tape} ariaLabel={copy.tapeLabel} />
      <p className="mt-4 font-mono text-2xl font-semibold tracking-tight">{copy.servedOf(s.served, result.nTicks)}</p>
    </div>
  </StoryStage>;
}
