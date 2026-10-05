import { describe, expect, it } from "vitest";
import { runExperience } from "./adapter";
describe("Compuerta experience", () => { it("improves availability with failover under the same outage", async () => { const signal = new AbortController().signal; const run = await runExperience({ outageStart: 8, outageEnd: 20, failover: true, hedge: false }, signal, () => undefined); expect(run.result.protected.availability).toBeGreaterThan(run.result.baseline.availability); }); });
