"use client";
import type { PlaybackFrame } from "@/design-system/demo/playback";
import type { TraceEvent } from "@/design-system/demo/types";
import { StoryStage } from "@/design-system/demo/decision-lab";
import { OutcomeTape, useReducedMotion } from "@/design-system/demo/project-story";
import { revealedTicks } from "@/design-system/demo/outcome-tape";
import { FlowDiagram, type FlowTone } from "@/design-system/demo/flow-diagram";
import type { SimResult } from "@/lib/compuerta/types";
import type { ExperienceInput } from "./adapter";
import { sceneState } from "./scene-state";
import { STORY } from "./story";

const POS = { clients: { x: 10, y: 95 }, gateway: { x: 230, y: 95 }, primary: { x: 470, y: 20 }, backup: { x: 470, y: 170 } } as const;
const W = 150, H = 70;

export function CompuertaScene({ frame, input, result, locale }: { frame: PlaybackFrame<TraceEvent>; input: ExperienceInput; result: SimResult; locale: "en" | "es" }) {
  const copy = STORY[locale].scene;
  const reduced = useReducedMotion();
  const revealed = revealedTicks(frame, result.nTicks, reduced);
  const s = sceneState(input, result, revealed);
  const tone: Record<keyof typeof POS, FlowTone> = { clients: "idle", gateway: "active", primary: s.primaryDown ? "danger" : "idle", backup: input.failover ? "success" : "off" };
  const nodes = (Object.keys(POS) as (keyof typeof POS)[]).map(id => ({ id, ...POS[id], ...copy.nodes[id], tone: tone[id] }));
  const target = s.packetOn === "backup" ? POS.backup : POS.primary;
  const packet = s.packetOn === "none" ? { x: POS.gateway.x + W / 2, y: POS.gateway.y + H / 2 } : { x: target.x - 12, y: target.y + H / 2 };
  return <StoryStage locale={locale} title={copy.title} caption={copy.caption} step={frame.visible} total={frame.total}>
    <FlowDiagram nodes={nodes} width={640} height={260} ariaLabel={copy.servedOf(s.served, result.nTicks)} edges={[
      { from: "clients", to: "gateway" },
      { from: "gateway", to: "primary", tone: s.primaryDown ? "danger" : "idle" },
      { from: "gateway", to: "backup", tone: input.failover ? "success" : "off" },
    ]}>
      <circle cx={packet.x} cy={packet.y} r="8" className="fill-accent transition-all duration-500 motion-reduce:transition-none" />
    </FlowDiagram>
    <div className="mt-6">
      <OutcomeTape cells={s.cells} labels={copy.tape} ariaLabel={copy.tapeLabel} />
      <p className="mt-4 font-mono text-2xl font-semibold tracking-tight">{copy.servedOf(s.served, result.nTicks)}</p>
    </div>
  </StoryStage>;
}
