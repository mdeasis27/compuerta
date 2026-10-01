"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert } from "@/design-system/components/alert";
import { Card } from "@/design-system/components/card";
import { MetricCard } from "@/design-system/components/metric-card";
import { StatusBadge } from "@/design-system/components/status-badge";

interface SimResult {
  availability: number;
  nTicks: number;
  success: number;
  failoverEvents: number;
  hedgedCalls: number;
  totalCost: number;
  trips: Record<string, number>;
  totalTrips: number;
  error?: string;
}

interface HistoryItem {
  id: number;
  availability: string;
  failovers: number;
  trips: number;
  created_at: string;
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export default function AppPage() {
  const [injectOutage, setInjectOutage] = useState(true);
  const [errorRate, setErrorRate] = useState(0.01);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  async function loadHistory() {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.simulations ?? []);
      }
    } catch {
      /* history is best-effort */
    }
  }

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ injectOutage, errorRate }),
      });
      const data = await res.json();
      setResult(data);
      if (res.ok) loadHistory();
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Error de red" } as SimResult);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/history")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) setHistory(data.simulations ?? []);
      })
      .catch(() => {
        /* history is best-effort */
      });
    return () => {
      active = false;
    };
  }, []);

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
            <StatusBadge tone="success" dot className="px-3 py-1">Postgres en vivo</StatusBadge>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Simula un outage y mide la disponibilidad</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Configura el error rate y el outage, y ejecuta la simulación determinista del gateway.
            El circuit breaker es la lógica real; el resultado queda <strong>persistido en Postgres</strong> y
            aparece en el historial.
          </p>
        </div>

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
            max={0.5}
            step={0.01}
            value={errorRate}
            onChange={(e) => setErrorRate(Number(e.target.value))}
            className="w-full accent-foreground"
          />

          <button
            onClick={run}
            disabled={loading}
            className="mt-4 w-full rounded-[var(--radius-md)] bg-accent px-4 py-2.5 text-sm font-medium text-[#ffffff] hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Simulando…" : "Ejecutar simulación"}
          </button>
        </Card>

        {result && (
          <div className="space-y-4">
            {result.error && (
              <Alert tone="danger" title="No se pudo ejecutar">{result.error}</Alert>
            )}

            {!result.error && (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <MetricCard label="Disponibilidad" value={pct(result.availability)} hint="en esta corrida" tone="success" />
                  <MetricCard label="Failovers" value={result.failoverEvents} hint="eventos de reruteo" />
                  <MetricCard label="Trips" value={result.totalTrips} hint="total en providers" tone={result.totalTrips > 0 ? "warning" : "success"} />
                  <MetricCard label="Hedged calls" value={result.hedgedCalls} hint="sobrecoste" tone="warning" />
                </div>

                <div className="rounded-[var(--radius-md)] shadow-[var(--shadow-card)] bg-card p-4 space-y-2 font-mono text-xs">
                  <div className="flex items-center gap-3">
                    <StatusBadge tone={injectOutage ? "danger" : "success"} dot>
                      {injectOutage ? "outage activo" : "sin outage"}
                    </StatusBadge>
                    <span className="text-muted-foreground">
                      {result.success}/{result.nTicks} requests ok · coste ${result.totalCost.toFixed(2)}
                    </span>
                  </div>
                  {Object.entries(result.trips).map(([id, n]) => (
                    <div key={id} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{id}</span>
                      <StatusBadge tone={n > 0 ? "danger" : "success"}>
                        {n > 0 ? `${n} trips` : "sin trips"}
                      </StatusBadge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {history.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">Historial de simulaciones (persistido en Postgres)</h3>
            <div className="overflow-x-auto rounded-[var(--radius-md)] shadow-[var(--shadow-card)] bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--gray-50)]">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Disponibilidad</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Failovers</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trips</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td className="px-4 py-2.5 text-foreground tabular-nums">{pct(Number(h.availability))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{h.failovers}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{h.trips}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {new Date(h.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
