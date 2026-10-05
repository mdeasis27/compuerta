import type { Heading } from "@/design-system/demo/project-story";

type NodeCopy = { name: string; sub: string; analogy: string };

export interface CompuertaStory {
  name: string;
  oneLiner: string;
  chips: string[];
  analogy: { heading: Heading; paragraphs: string[]; dictionaryLabel: string; dictionary: { term: string; means: string }[] };
  why: { title: string; text: string };
  tryIt: { heading: Heading; lead: string; question: (outageEnd: number, backup: boolean) => string; yes: string; no: string; backupLabel: string; outageEndLabel: string; note: string; simulate: string; cancel: string; reset: string; error: string; idle: string };
  compare: { heading: Heading; lead: string; on: string; off: string; served: string; sentence: (on: number, off: number) => string };
  fit: { heading: Heading; worthLabel: string; worth: string; notLabel: string; not: string };
  proves: { heading: Heading; text: string };
  engineers: { summary: string; points: string[]; repoLabel: string };
  scene: { title: string; caption: string; statusLabels: { active: string; danger: string; success: string; off: string }; tapeLabel: string; nodes: { clients: NodeCopy; gateway: NodeCopy; primary: NodeCopy; backup: NodeCopy }; tape: { served: string; rerouted: string; lost: string }; servedOf: (n: number, total: number) => string };
}

const engineerPointsEn = [
  "One circuit breaker per provider: a window of 3 requests, it opens at 40% errors or when p95 latency passes 500 ms, and waits 3 requests before testing the provider again.",
  "Failover follows a preference list per request type; optional hedging duplicates a slow request to the backup after 280 ms.",
  "The simulation is deterministic: a seeded generator, the same math in TypeScript and Python, pinned by shared fixtures that both test suites read.",
  "Stack: Next.js 16, TypeScript, Python, Vitest, pytest.",
];
const engineerPointsEs = [
  "Un circuit breaker por proveedor: ventana de 3 solicitudes, se abre con 40% de errores o cuando la latencia p95 pasa de 500 ms, y espera 3 solicitudes antes de volver a probar al proveedor.",
  "El failover sigue una lista de preferencia por tipo de solicitud; el hedging opcional duplica una solicitud lenta hacia el respaldo después de 280 ms.",
  "La simulación es determinista: un generador con semilla, la misma matemática en TypeScript y Python, fijada por fixtures compartidos que leen las dos suites de tests.",
  "Stack: Next.js 16, TypeScript, Python, Vitest, pytest.",
];

export const STORY: Record<"en" | "es", CompuertaStory> = {
  en: {
    name: "Compuerta",
    oneLiner: "An automatic detour for the day the AI service your company relies on stops answering.",
    chips: ["Service continuity", "2 min", "Live demo"],
    analogy: {
      heading: { before: "The", accent: "analogy" },
      paragraphs: [
        "Think about your drive to work. One day there's a crash on the highway and the maps app on your phone sends you down the side road before you reach the jam. You arrive five minutes late, but you arrive.",
        "Compuerta does the same for an AI assistant. When the main provider fails, it sends requests to a backup, and when the main one recovers, it switches back.",
      ],
      dictionaryLabel: "In the diagram below",
      dictionary: [
        { term: "each car", means: "a customer" },
        { term: "the highway", means: "the main provider" },
        { term: "the crash", means: "the outage" },
        { term: "the side road", means: "the backup provider" },
        { term: "the maps app", means: "Compuerta" },
      ],
    },
    why: { title: "Why I built it", text: "" },
    tryIt: {
      heading: { before: "Try", accent: "it" },
      lead: "Thirty customers write to a support assistant. Partway through, the main provider stops answering.",
      question: (end, backup) => `Before you run it, place a bet: ${backup ? "with" : "without"} the backup route and an outage from request 8 to ${end}, do at least 24 of 30 customers get served?`,
      yes: "Yes, 24 or more",
      no: "No, fewer than 24",
      backupLabel: "Use the backup route",
      outageEndLabel: "The outage ends at request",
      note: "Each square is one customer request. The backup can also fail now and then, like any real provider.",
      simulate: "Run it",
      cancel: "Cancel",
      reset: "Start over",
      error: "The outage could not be simulated. Try another end point.",
      idle: "Place your bet and press Run it.",
    },
    compare: {
      heading: { before: "With", accent: "or without", after: "a backup" },
      lead: "Same outage, same customers. The only change is whether the detour exists.",
      on: "With the backup",
      off: "Without the backup",
      served: "customers served",
      sentence: (on, off) => {
        const d = on - off;
        if (d === 0) return `Both setups served ${on} customers. This outage was too short to make a difference.`;
        if (d < 0) return `This time the backup served fewer: ${on} customers with it, ${off} without it.`;
        return `With the backup, ${on} customers were served. Without it, ${off}. ${d === 1 ? "That's one person" : `That's ${d} people`} staring at a "try again later".`;
      },
    },
    fit: {
      heading: { before: "Where it", accent: "fits" },
      worthLabel: "Worth it",
      worth: "When someone is waiting for the answer on the other side. I picture a bank's support chat at eleven at night, or an online purchase that keeps spinning while the customer decides whether to just leave.",
      notLabel: "Not needed",
      not: "If the work can wait until tomorrow, like a report that runs overnight.",
    },
    proves: {
      heading: { before: "What it", accent: "proves" },
      text: "I started with the uncomfortable question: what happens the day the provider goes down? Then I measured it in customers served, because that's how an operations director measures it when someone asks how the service did.",
    },
    engineers: { summary: "For engineers", points: engineerPointsEn, repoLabel: "Source code" },
    scene: {
      title: "The route each request took",
      caption: "Watch the main provider turn red during the outage and the requests move to the backup.",
      statusLabels: { active: "picking the route", danger: "down", success: "on", off: "off" },
      tapeLabel: "Thirty customer requests, in order",
      nodes: {
        clients: { name: "Customers", sub: "30 requests", analogy: "the cars" },
        gateway: { name: "Compuerta", sub: "picks the route", analogy: "the maps app" },
        primary: { name: "Provider A", sub: "main", analogy: "the highway" },
        backup: { name: "Provider B", sub: "backup", analogy: "the side road" },
      },
      tape: { served: "served", rerouted: "sent to the backup", lost: "lost" },
      servedOf: (n, total) => `${n} of ${total} customers served`,
    },
  },
  es: {
    name: "Compuerta",
    oneLiner: "Un desvío automático para cuando el servicio de IA del que depende tu empresa deja de contestar.",
    chips: ["Continuidad del servicio", "2 min", "Demo en vivo"],
    analogy: {
      heading: { before: "La", accent: "analogía" },
      paragraphs: [
        "Piensa en tu ruta al trabajo. Un día hay un choque en la autopista y la app de mapas del celular te saca por la lateral antes de que llegues al tráfico. Llegas cinco minutos tarde, pero llegas.",
        "Compuerta hace lo mismo con un asistente de IA. Cuando el proveedor principal falla, manda las solicitudes a uno de respaldo, y cuando el principal se recupera, regresa.",
      ],
      dictionaryLabel: "En el diagrama de abajo",
      dictionary: [
        { term: "cada coche", means: "un cliente" },
        { term: "la autopista", means: "el proveedor principal" },
        { term: "el choque", means: "la caída" },
        { term: "la lateral", means: "el proveedor de respaldo" },
        { term: "la app de mapas", means: "Compuerta" },
      ],
    },
    why: { title: "Por qué lo hice", text: "" },
    tryIt: {
      heading: { accent: "Pruébalo" },
      lead: "Treinta clientes le escriben a un asistente de soporte. A media jornada, el proveedor principal deja de contestar.",
      question: (end, backup) => `Antes de correrlo, apuesta: ${backup ? "con" : "sin"} la ruta de respaldo y con una caída de la solicitud 8 a la ${end}, ¿se atiende al menos a 24 de los 30 clientes?`,
      yes: "Sí, 24 o más",
      no: "No, menos de 24",
      backupLabel: "Usar la ruta de respaldo",
      outageEndLabel: "La caída termina en la solicitud",
      note: "Cada cuadrito es la solicitud de un cliente. El respaldo también puede fallar de vez en cuando, como cualquier proveedor real.",
      simulate: "Correr",
      cancel: "Cancelar",
      reset: "Empezar de nuevo",
      error: "No se pudo simular la caída. Prueba con otro punto final.",
      idle: "Haz tu apuesta y presiona Correr.",
    },
    compare: {
      heading: { before: "Con", accent: "o sin", after: "respaldo" },
      lead: "La misma caída y los mismos clientes. Lo único que cambia es si existe el desvío.",
      on: "Con respaldo",
      off: "Sin respaldo",
      served: "clientes atendidos",
      sentence: (on, off) => {
        const d = on - off;
        if (d === 0) return `Las dos configuraciones atendieron a ${on} clientes. Esta caída fue demasiado corta para notar la diferencia.`;
        if (d < 0) return `Esta vez el respaldo atendió a menos: ${on} clientes con él y ${off} sin él.`;
        return `Con respaldo se atendió a ${on} clientes. Sin respaldo, a ${off}. ${d === 1 ? "Es una persona que se quedó" : `Son ${d} personas que se quedaron`} viendo un "intenta más tarde".`;
      },
    },
    fit: {
      heading: { before: "¿Dónde", accent: "sirve?" },
      worthLabel: "Vale la pena",
      worth: "Cuando hay alguien esperando la respuesta del otro lado. Pienso en el chat de soporte de un banco a las once de la noche, o en una compra en línea que se queda girando mientras el cliente decide si mejor se va.",
      notLabel: "No hace falta",
      not: "Si el trabajo puede esperar a mañana, como un reporte que corre de madrugada.",
    },
    proves: {
      heading: { before: "Lo que", accent: "demuestra" },
      text: "Empecé por la pregunta incómoda: ¿qué pasa el día que el proveedor se cae? Luego lo medí en clientes atendidos, porque así lo mide un director de operaciones cuando le preguntan cómo le fue al servicio.",
    },
    engineers: { summary: "Para ingenieros", points: engineerPointsEs, repoLabel: "Código fuente" },
    scene: {
      title: "La ruta que tomó cada solicitud",
      caption: "Mira cómo el proveedor principal se pone en rojo durante la caída y las solicitudes se pasan al respaldo.",
      statusLabels: { active: "eligiendo la ruta", danger: "caído", success: "activo", off: "apagado" },
      tapeLabel: "Treinta solicitudes de clientes, en orden",
      nodes: {
        clients: { name: "Clientes", sub: "30 solicitudes", analogy: "los coches" },
        gateway: { name: "Compuerta", sub: "elige la ruta", analogy: "la app de mapas" },
        primary: { name: "Proveedor A", sub: "principal", analogy: "la autopista" },
        backup: { name: "Proveedor B", sub: "respaldo", analogy: "la lateral" },
      },
      tape: { served: "atendida", rerouted: "enviada al respaldo", lost: "perdida" },
      servedOf: (n, total) => `${n} de ${total} clientes atendidos`,
    },
  },
};
