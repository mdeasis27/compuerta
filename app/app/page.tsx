"use client";

import { useState } from "react";
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
import { simulate } from "@/lib/compuerta/sim";
import type { SimConfig, SimResult } from "@/lib/compuerta/types";

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
  const [injectOutage, setInjectOutage] = useState(true);
  const [errorRate, setErrorRate] = useState(0.01);
  const [hedgeEnabled, setHedgeEnabled] = useState(true);
  const [result, setResult] = useState<SimResult | null>(null);

  function run() {
    const config: SimConfig = {
      ...CONFIG,
      providers: CONFIG.providers.map((p) => ({ ...p, errorRate })),
      classes: {
        ...CONFIG.classes,
        long: { ...CONFIG.classes.long, hedged: hedgeEnabled },
      },
      outage: injectOutage
        ? CONFIG.outage
        : { ...CONFIG.outage, startTick: 0, endTick: 0 },
    };
    setResult(simulate(config));
  }

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

        {/* ── LIVE SIMULATION ─────────────────── */}
        <section>
          <h2 className="text-lg font-semibold tracking-tight text-foreground mb-1">Simulación en vivo</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Configura el error rate, el hedging y el outage, y ejecuta la simulación determinista.
            El breaker es la lógica real; los providers son stand-ins sin red.
          </p>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <label htmlFor="outage" className="text-sm text-foreground">Inyectar outage</label>
              <input
                id="outage"
                type="checkbox"
                checked={injectOutage}
                onChange={(e) => setInjectOutage(e.target.checked)}
                className="h-4 w-4 accent-foreground"
              />
            </div>

            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-foreground">Error rate (providers)</span>
              <span className="font-mono text-sm tabular-nums text-foreground">{errorRate.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={errorRate}
              onChange={(e) => setErrorRate(Number(e.target.value))}
              className="w-full accent-foreground"
            />

            <div className="flex items-center justify-between mt-4 mb-4">
              <label htmlFor="hedge" className="text-sm text-foreground">Hedged calls (clase long)</label>
              <input
                id="hedge"
                type="checkbox"
                checked={hedgeEnabled}
                onChange={(e) => setHedgeEnabled(e.target.checked)}
                className="h-4 w-4 accent-foreground"
              />
            </div>

            <button
              onClick={run}
              className="w-full rounded-[var(--radius-md)] bg-accent px-4 py-2.5 text-sm font-medium text-[#ffffff] hover:bg-accent/90 transition-colors"
            >
              Ejecutar simulación
            </button>
          </Card>

          {result && (
            <Card className="mt-4 p-5">
              <div className="flex items-center gap-3">
                <StatusBadge tone={injectOutage ? "danger" : "success"} dot>
                  {injectOutage ? "outage activo" : "sin outage"}
                </StatusBadge>
                <span className="text-sm text-muted-foreground">
                  {result.success}/{result.nTicks} requests ok
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <MetricCard label="Disponibilidad" value={pct(result.availability)} hint="en esta corrida" tone="success" />
                <MetricCard label="Failovers" value={result.failoverEvents} hint="eventos de reruteo" />
                <MetricCard label="Hedged calls" value={result.hedgedCalls} hint="sobrecoste" tone="warning" />
                <MetricCard label="Coste total" value={`$${result.totalCost.toFixed(2)}`} hint="incl. hedges" />
              </div>
              <div className="mt-4 space-y-2 font-mono text-xs">
                {Object.entries(result.trips).map(([id, n]) => (
                  <div key={id} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{id}</span>
                    <StatusBadge tone={n > 0 ? "danger" : "success"}>
                      {n > 0 ? `${n} trips` : "sin trips"}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>

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
