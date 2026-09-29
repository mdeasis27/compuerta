// lib/compuerta/errors.ts
// Deterministic error taxonomy — free, unambiguous classification before any
// LLM judge. Mirrors backend/src/compuerta/errors.py.

import type { ErrorClass } from "./types";

export function classifyError(message: string): ErrorClass {
  const m = message.toLowerCase();
  if (m.includes("rate") || m.includes("429")) return "rate_limit";
  if (m.includes("timeout") || m.includes("timed out")) return "timeout";
  if (m.includes("auth") || m.includes("401") || m.includes("403")) return "auth";
  if (m.includes("content") || m.includes("filter")) return "content_filter";
  if (/\b5\d\d\b/.test(m) || m.includes("500") || m.includes("502") || m.includes("503")) return "server";
  return "unknown";
}
