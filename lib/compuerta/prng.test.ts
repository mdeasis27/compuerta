import { describe, expect, it } from "vitest";

import { lcgSequence } from "./prng";

describe("lcg", () => {
  it("is deterministic and bounded", () => {
    const a = lcgSequence(42, 100);
    const b = lcgSequence(42, 100);
    expect(a).toEqual(b);
    for (const v of a) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("differs across seeds", () => {
    expect(lcgSequence(42, 5)).not.toEqual(lcgSequence(7, 5));
  });
});
