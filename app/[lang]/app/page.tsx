"use client";
import { useState } from "react";
import { useLocale } from "@/design-system/i18n/context";
import { TracePlayer } from "@/design-system/demo/trace-player";
import { ScenarioPicker } from "@/design-system/demo/decision-lab";
import { MissionBrief, MissionPrompt, MissionComparison, DecisionNotes } from "@/design-system/demo/mission-lab";
import { useDemoRun } from "@/design-system/demo/use-demo-run";
import { traceCopy } from "@/lib/experience/trace-copy";
import { runMission } from "@/lib/experience/mission";
import { CompuertaScene } from "@/lib/experience/compuerta-scene";
export default function Page() {
    const locale = useLocale();
    const es = locale === "es";
    const [failover, setFailover] = useState(true);
    const [outageEnd, setOutageEnd] = useState(20);
    const [scenario, setScenario] = useState("a");
    const [prediction, setPrediction] = useState<string | null>(null);
    const demo = useDemoRun(runMission);
    const result = demo.run?.result;
    const clear = () => { setPrediction(null); demo.reset(); };
    const manual = (update: () => void) => { update(); setScenario(""); clear(); };
    const choose = (id: string) => { setScenario(id); setOutageEnd(20); setFailover(id === "a"); clear(); };
    const input = { outageStart: 8, outageEnd, failover, hedge: false };
    return <main className="mx-auto max-w-6xl px-5 py-8 text-foreground sm:py-12">
    <MissionBrief locale={locale} name="COMPUERTA" title={es ? "¿Seguirá funcionando durante una caída?" : "Will it keep working through an outage?"} context={es ? "El asistente de soporte depende de un proveedor que deja de responder. Decide si activas una ruta de respaldo y comprueba cuántas solicitudes terminan." : "A support assistant depends on a provider that stops responding. Decide whether to enable a backup route and check how many requests complete."} role={es ? "Responsable de continuidad" : "Continuity lead"} stakes={es ? "Disponibilidad del servicio" : "Service availability"}/>
    <ScenarioPicker locale={locale} selected={scenario} onSelect={choose} options={[{ id: "a", label: es ? "Con respaldo" : "With backup", description: es ? "Caída del tick 8 al 20; ruta alternativa activa." : "Outage from tick 8 to 20; alternate route enabled." }, { id: "b", label: es ? "Sin respaldo" : "Without backup", description: es ? "La misma caída; ruta alternativa desactivada." : "The same outage; alternate route disabled." }]}/>
    <div className="grid items-start gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <section className="min-w-0 rounded-xl border border-border p-5">
    <button type="button" data-mission-challenge className="mb-6 rounded-lg border border-accent px-4 py-3 text-sm" onClick={() => manual(() => { setOutageEnd(27); setFailover(false); })}>{es ? "Probar el reto: caída prolongada sin respaldo" : "Try the challenge: extended outage without backup"} →</button>

        <label className="flex gap-2"><input checked={failover} onChange={e => manual(() => setFailover(e.target.checked))} type="checkbox"/> {es ? "Activar ruta de respaldo" : "Enable backup route"}</label>
        <label className="mt-5 block">{es ? "La caída termina en tick" : "Outage ends at tick"} {outageEnd}<input aria-label={es ? "Final de la caída" : "Outage end"} className="mt-2 w-full" type="range" min="10" max="28" value={outageEnd} onChange={e => manual(() => setOutageEnd(Number(e.target.value)))}/></label>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{es ? "30 ticks representan 30 solicitudes simuladas, no segundos reales. El respaldo también está sujeto a errores del simulador." : "30 ticks represent 30 simulated requests, not real seconds. The backup is also subject to simulator errors."}</p>
        <MissionPrompt locale={locale} question={es ? "Con tu configuración, ¿se completarán al menos 24 de las 30 solicitudes simuladas?" : "With your configuration, will at least 24 of the 30 simulated requests complete?"} prediction={prediction} onPredict={setPrediction} locked={Boolean(demo.run) || demo.running} options={[{ id: "yes", label: es ? "Sí, al menos 24" : "Yes, at least 24" }, { id: "no", label: es ? "No, menos de 24" : "No, fewer than 24" }]}/>
        <div className="mt-6 flex flex-wrap gap-2"><button data-run-experiment disabled={demo.running} className="min-w-0 flex-1 rounded-lg bg-accent px-4 py-3 text-white" onClick={() => demo.execute(input)}>{es ? "Simular" : "Simulate"}</button><button className="rounded-lg border px-3 py-3" onClick={demo.cancel}>{es ? "Cancelar" : "Cancel"}</button><button className="rounded-lg border px-3 py-3" onClick={() => choose("a")}>{es ? "Reiniciar" : "Reset"}</button></div>
        {demo.error && <p role="alert" className="mt-3 text-danger">{es ? "No se pudo simular la caída." : "The outage could not be simulated."}</p>}
      </section>
      <section className="min-w-0">
        {result && demo.run ? <TracePlayer collapsible translate={key => traceCopy(locale, key)} trace={demo.trace} locale={locale} executionMs={demo.run.executionMs} renderStage={frame => <>
          <CompuertaScene frame={frame} input={demo.run!.input} result={result} locale={locale}/>
          {frame.complete && <MissionComparison locale={locale} prediction={prediction} actual={result.protected.success >= 24 ? "yes" : "no"} actualLabel={es ? `Tu configuración completa ${result.protected.success} de 30 solicitudes.` : `Your configuration completes ${result.protected.success} of 30 requests.`} sides={[
                        { label: es ? "Respaldo activado" : "Backup enabled", value: `${result.comparison.enabled.success} / 30`, detail: es ? `${(result.comparison.enabled.availability * 100).toFixed(1)}% de disponibilidad simulada.` : `${(result.comparison.enabled.availability * 100).toFixed(1)}% simulated availability.`, positive: result.comparison.enabled.success > result.comparison.disabled.success },
                        { label: es ? "Respaldo desactivado" : "Backup disabled", value: `${result.comparison.disabled.success} / 30`, detail: es ? `${(result.comparison.disabled.availability * 100).toFixed(1)}% de disponibilidad simulada.` : `${(result.comparison.disabled.availability * 100).toFixed(1)}% simulated availability.` },
                    ]} explanation={es ? "Se conserva la caída, las 30 solicitudes, el interruptor de circuito y la semilla. Solo cambia la ruta de respaldo. El simulador es determinista, pero las rutas consumen su secuencia de errores de forma distinta; esto no es una medición de un servicio real." : "The outage, 30 requests, circuit breaker and seed stay fixed. Only the backup route changes. The simulator is deterministic, but routing consumes its error sequence differently; this is not a measurement of a real service."}/>}</>}/> : <p className="rounded-xl border border-border p-6 text-muted-foreground">{es ? "Predice el resultado y simula. La comparación aparecerá al revelar la traza completa." : "Predict the outcome and simulate. The comparison appears when you reveal the full trace."}</p>}
      </section>
    </div>
    <DecisionNotes locale={locale} implementation={es ? "Máquina de estados del interruptor de circuito, respaldo y simulador reproducible con semilla." : "Circuit-breaker state machine, backup routing and a reproducible seeded simulator."} rationale={es ? "Un respaldo puede preservar disponibilidad, pero añade complejidad. La demo aísla la política de ruta y no promete disponibilidad real." : "A backup can preserve availability but adds complexity. The demo isolates routing policy and does not promise real availability."} production={es ? "Validar errores correlacionados, tiempos de espera, límites de capacidad, observabilidad y recuperación con pruebas de carga e incidentes." : "Validate correlated failures, timeouts, capacity limits, observability and recovery with load and incident tests."}/>
  </main>;
}
