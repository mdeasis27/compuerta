// lib/compuerta/types.ts

export type ProviderState = "closed" | "open" | "halfOpen";

export type ErrorClass = "rate_limit" | "timeout" | "server" | "content_filter" | "auth" | "unknown";

export interface ProviderConfig {
  id: string;
  baseLatencyMs: number;
  jitterMs: number;
  errorRate: number;
  costCentsPer1k: number;
}

export interface RequestClassConfig {
  preference: string[];
  hedged: boolean;
  hedgeBudgetMs?: number;
  tokens: number;
}

export interface BreakerConfig {
  windowSize: number;
  errorThreshold: number;
  p95BudgetMs: number;
  cooldown: number;
}

export interface OutageConfig {
  provider: string;
  startTick: number;
  endTick: number;
}

export interface SimConfig {
  providers: ProviderConfig[];
  classes: Record<string, RequestClassConfig>;
  breaker: BreakerConfig;
  outage: OutageConfig;
  tenants: string[];
  nTicks: number;
  lcg: { seed: number; a: number; c: number; m: number };
}

export interface BreakerEvent {
  tick: number;
  provider: string;
  kind: "trip" | "recover" | "reopen";
}

export interface SimResult {
  availability: number;
  nTicks: number;
  success: number;
  failoverEvents: number;
  hedgedCalls: number;
  trips: Record<string, number>;
  finalBreakerStates: Record<string, ProviderState>;
  events: BreakerEvent[];
  totalCostCents: number;
  costCentsByTenant: Record<string, number>;
  costCentsByFeature: Record<string, number>;
}
