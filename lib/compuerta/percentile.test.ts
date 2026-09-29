import { describe, expect, it } from "vitest";

import { p50, p95, p99, percentile } from "./percentile";

describe("percentile (numpy linear)", () => {
  it("matches hand-computed values on [1,2,3,4]", () => {
    expect(p50([1, 2, 3, 4])).toBeCloseTo(2.5, 10);
    expect(p95([1, 2, 3, 4])).toBeCloseTo(3.85, 10);
    expect(p99([1, 2, 3, 4])).toBeCloseTo(3.97, 10);
  });

  it("handles single-element and uniform arrays", () => {
    expect(percentile([7], 95)).toBe(7);
    expect(p50([5, 5, 5])).toBeCloseTo(5, 10);
  });

  it("is order-independent (sorts internally)", () => {
    expect(p50([4, 1, 3, 2])).toBeCloseTo(2.5, 10);
  });
});
