import { NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { CONFIG } from "@/lib/compuerta/demo";
import { simulate } from "@/lib/compuerta/sim";
import type { SimConfig } from "@/lib/compuerta/types";

export async function POST(request: Request) {
  let injectOutage: boolean;
  let errorRate: number | undefined;
  try {
    const body = await request.json();
    injectOutage = body.injectOutage === true;
    errorRate =
      typeof body.errorRate === "number" && Number.isFinite(body.errorRate)
        ? body.errorRate
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
    totalCost: result.totalCost,
    trips: result.trips,
    totalTrips,
  });
}
