import type { PlaybackFrame } from "@/design-system/demo/playback";
import type { TraceEvent } from "@/design-system/demo/types";
import { tapeCells, type TapeStatus } from "@/design-system/demo/outcome-tape";
import type { SimResult } from "@/lib/compuerta/types";
import type { ExperienceInput } from "./adapter";

/** Used when a run produced no breaker events: show the final result at once. */
export const COMPLETE_FRAME: PlaybackFrame<TraceEvent> = { visible: 0, total: 0, event: undefined, complete: true };

export function sceneState(input: ExperienceInput, result: SimResult, revealed: number): { primaryDown: boolean; packetOn: "primary" | "backup" | "none"; cells: TapeStatus[]; served: number } {
  const cells = tapeCells(result.servedBy, "primary", revealed);
  const last = Math.min(revealed, result.servedBy.length) - 1;
  const primaryDown = last >= 0 && last >= input.outageStart && last < input.outageEnd;
  const lastProvider = last >= 0 ? result.servedBy[last] : "primary";
  const packetOn = lastProvider === null ? "none" : lastProvider === "primary" ? "primary" : "backup";
  return { primaryDown, packetOn, cells, served: cells.filter(c => c === "served" || c === "rerouted").length };
}
