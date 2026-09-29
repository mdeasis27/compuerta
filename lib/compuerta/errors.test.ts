import { describe, expect, it } from "vitest";

import { classifyError } from "./errors";

describe("classifyError", () => {
  it("classifies each taxonomy bucket deterministically", () => {
    expect(classifyError("429 Too Many Requests")).toBe("rate_limit");
    expect(classifyError("request timed out")).toBe("timeout");
    expect(classifyError("401 Unauthorized")).toBe("auth");
    expect(classifyError("content filter triggered")).toBe("content_filter");
    expect(classifyError("500 Internal Server Error")).toBe("server");
    expect(classifyError("something weird")).toBe("unknown");
  });
});
