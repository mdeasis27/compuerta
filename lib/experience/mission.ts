import {runExperience, type ExperienceInput, type ExperienceResult} from "./adapter";
import type {DemoAdapter} from "@/design-system/demo/types";

export type MissionResult = ExperienceResult & {comparison:{enabled:ExperienceResult["protected"];disabled:ExperienceResult["protected"]}};
export const runMission: DemoAdapter<ExperienceInput, MissionResult> = async (input, signal, onEvent) => {
  const start = performance.now();
  const run = await runExperience(input, signal, onEvent);
  const other = await runExperience({...input, failover:!input.failover}, signal, () => {});
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  return {...run, executionMs:performance.now()-start, result:{...run.result, comparison:{
    enabled:input.failover ? run.result.protected : other.result.protected,
    disabled:input.failover ? other.result.protected : run.result.protected,
  }}};
};
