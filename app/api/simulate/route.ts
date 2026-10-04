import { NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { CONFIG } from "@/lib/compuerta/demo";
import { simulate } from "@/lib/compuerta/sim";
import type { SimConfig } from "@/lib/compuerta/types";

export async function POST(request: Request) {
  let injectOutage: boolean;
  let errorRate: number | undefined;
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null) throw new Error("Invalid JSON object");
    const payload = body as Record<string, unknown>;
    injectOutage = payload.injectOutage === true;
    errorRate =
      typeof payload.errorRate === "number" && Number.isFinite(payload.errorRate)
        ? payload.errorRate
        : undefined;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  const config: SimConfig = {
    ...CONFIG,
    providers: CONFIG.providers.map((p) => ({ ...p, errorRate: errorRate ?? p.errorRate })),
    outage: injectOutage ? CONFIG.outage : { ...CONFIG.outage, startTick: 0, endTick: 0 },
  };

  const result = simulate(config);
  const totalTrips = Object.values(result.trips).reduce((sum, n) => sum + n, 0);

  try {
    const db = getSql();
    await db`INSERT INTO compuerta.simulations (availability, failovers, trips) VALUES (${result.availability}, ${result.failoverEvents}, ${totalTrips})`;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error guardando la simulación" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    availability: result.availability,
    nTicks: result.nTicks,
    success: result.success,
    failoverEvents: result.failoverEvents,
    hedgedCalls: result.hedgedCalls,
    totalCostCents: result.totalCostCents,
    costCentsByTenant: result.costCentsByTenant,
    costCentsByFeature: result.costCentsByFeature,
    trips: result.trips,
    totalTrips,
  });
}
