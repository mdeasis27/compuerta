import {expect, test} from "vitest";
import {runMission} from "./mission";
import {runExperience} from "./adapter";

test("compares failover policies under exactly the selected outage", async () => {
  const input={outageStart:8,outageEnd:27,failover:false,hedge:false};
  const signal=new AbortController().signal;
  const run=await runMission(input,signal,()=>{});
  const on=await runExperience({...input,failover:true},signal,()=>{});
  const off=await runExperience(input,signal,()=>{});
  expect(run.result.comparison.enabled).toEqual(on.result.protected);
  expect(run.result.comparison.disabled).toEqual(off.result.protected);
  expect(run.result.comparison.enabled.success).toBeGreaterThan(run.result.comparison.disabled.success);
  expect(run.input).toEqual(input);
  expect(input.failover).toBe(false);
  expect(run.trace).toEqual(off.trace.map((event,index)=>({...event,timestampMs:run.trace[index].timestampMs})));
});
test("cancelled missions never compute or expose a counterfactual",async()=>{
  const controller=new AbortController();
  await expect(runMission({outageStart:8,outageEnd:20,failover:true,hedge:false},controller.signal,()=>controller.abort())).rejects.toThrow("Aborted");
});
