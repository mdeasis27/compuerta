"use client";

import Link from "next/link";
import { Alert } from "@/design-system/components/alert";
import { Card } from "@/design-system/components/card";
import { MetricCard } from "@/design-system/components/metric-card";
import { StatusBadge } from "@/design-system/components/status-badge";
import {
  CONFIG,
  getAvailabilityDeltaPp,
  getBaseline,
  getFailoverCount,
  getOutage,
  getProviders,
  getSimulation,
} from "@/lib/compuerta/demo";

const SIM = getSimulation();
const BASE = getBaseline();
const DELTA = getAvailabilityDeltaPp();
const OUTAGE = getOutage();
const PROVIDERS = getProviders();

const STATE_TONE: Record<string, "success" | "danger" | "warning" | "info"> = {
  closed: "success",
  open: "danger",
  halfOpen: "warning",
};

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export default function AppPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              Inicio
            </Link>
            <div className="h-4 w-px bg-[var(--border)]" aria-hidden="true" />
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <svg className="h-4 w-4 text-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5L12 21l-4.5-4.5V3.75m9 0H3m9 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 3.75m9 0A2.25 2.25 0 0 1 9.75 1.5h2.25" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-foreground leading-tight">Compuerta</h1>
                <p className="text-xs text-muted-foreground">Self-healing gateway</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge tone="info" dot className="px-3 py-1">
              Demo mode
            </StatusBadge>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        {/* ── SUMMARY BAR ─────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard
            label="Disponibilidad"
            value={pct(SIM.availability)}
            hint="a través del outage"
            tone="success"
          />
          <MetricCard
            label="Δ vs sin failover"
            value={`+${DELTA.toFixed(1)}pp`}
            hint={`${pct(BASE.availability)} → ${pct(SIM.availability)}`}
            tone="success"
          />
          <MetricCard label="Failovers" value={getFailoverCount()} hint="eventos de reruteo" />
          <MetricCard label="Hedged calls" value={SIM.hedgedCalls} hint="sobrecoste documentado" tone="warning" />
        </div>

        {/* ── OUTAGE NARRATIVE ────────────────── */}
        <section>
          <h2 className="text-lg font-semibold tracking-tight text-foreground mb-1">Outage simulado</h2>
          <p className="text-sm text-muted-foreground mb-5">
            El provider primario <strong className="text-foreground">{OUTAGE.provider}</strong> cae
            entre los ticks {OUTAGE.startTick} y {OUTAGE.endTick}. El circuit breaker se dispara, el
            tráfico se rerutea y — al recuperarse el provider — un probe half-open cierra el breaker.
          </p>
          <Card className="p-5">
            <div className="space-y-2 font-mono text-xs">
              {SIM.events.map((e, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-muted-foreground tabular-nums">tick {e.tick}</span>
                  <StatusBadge
                    tone={e.kind === "trip" ? "danger" : e.kind === "reopen" ? "warning" : "success"}
                  >
                    {e.kind}
                  </StatusBadge>
                  <span className="text-foreground">{e.provider}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ── PROVIDERS ───────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold tracking-tight text-foreground mb-1">Providers</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Tres providers simulados deterministas; el breaker es la lógica real (sin red).
          </p>
          <div className="overflow-x-auto rounded-[var(--radius-md)] shadow-[var(--shadow-card)] bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--gray-50)]">
                  <th scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provider</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Latencia base</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Error rate</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">$/1k</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Breaker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {PROVIDERS.map((p) => {
                  const state = SIM.finalBreakerStates[p.id];
                  const trips = SIM.trips[p.id];
                  return (
                    <tr key={p.id}>
                      <td className="px-5 py-3.5 font-semibold text-foreground">{p.id}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-foreground">{p.baseLatencyMs}ms</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">{p.errorRate}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">${p.costPer1k}</td>
                      <td className="px-4 py-3.5 text-right">
                        <StatusBadge tone={STATE_TONE[state]}>
                          {state}
                          {trips > 0 ? ` · ${trips} trip` : ""}
                        </StatusBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── COST ATTRIBUTION ────────────────── */}
        <section>
          <h2 className="text-lg font-semibold tracking-tight text-foreground mb-1">Atribución de coste</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Cada request lleva tenant, feature y request id — sin eso no hay atribución, que es la
            mitad del valor de un gateway.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Por tenant</p>
              <div className="space-y-2">
                {Object.entries(SIM.costByTenant).map(([tenant, cost]) => (
                  <div key={tenant} className="flex justify-between text-sm">
                    <span className="text-foreground">{tenant}</span>
                    <span className="tabular-nums text-muted-foreground">${cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Por feature</p>
              <div className="space-y-2">
                {Object.entries(SIM.costByFeature).map(([feature, cost]) => (
                  <div key={feature} className="flex justify-between text-sm">
                    <span className="text-foreground">{feature}</span>
                    <span className="tabular-nums text-muted-foreground">${cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <hr className="border-[var(--border)] my-3" />
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-foreground">Total (incl. hedges)</span>
                <span className="tabular-nums text-foreground">${SIM.totalCost.toFixed(2)}</span>
              </div>
            </Card>
          </div>
        </section>

        {/* ── HEDGING TRADEOFF ───────────────── */}
        <section>
          <h2 className="text-lg font-semibold tracking-tight text-foreground mb-1">Hedged requests</h2>
          <Alert tone="warning" title="Sobrecoste documentado">
            {SIM.hedgedCalls} de {Math.floor(SIM.nTicks / 2)} llamadas de clase &quot;long&quot; dispararon
            un hedge (latencia &gt; {CONFIG.classes.long.hedgeBudgetMs}ms), doblando el gasto en esa
            fracción. Es el coste de garantizar la cola de latencia: hedging ≈ 2× el spend en las
            llamadas cubiertas.
          </Alert>
        </section>

        <footer className="pt-8 border-t border-[var(--border)] flex items-center justify-between text-xs text-muted-foreground">
          <span>Compuerta · Self-healing gateway · Demo mode</span>
          <a href="https://github.com/mdeasis27/compuerta" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors font-mono">GitHub</a>
        </footer>
      </div>
    </div>
  );
}
