// scripts/seed.mjs
// Creates the compuerta schema + table and seeds no data (simulations are
// generated live). Kept symmetrical with the other projects so the schema
// exists before the first request.
// Run: node scripts/seed.mjs  (requires DATABASE_URL in env or .env.local)

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* no .env.local */
  }
}

loadEnv();

const sql = neon(process.env.DATABASE_URL);

async function main() {
  await sql`CREATE SCHEMA IF NOT EXISTS compuerta`;
  await sql`DROP TABLE IF EXISTS compuerta.simulations`;

  await sql`
    CREATE TABLE compuerta.simulations (
      id serial PRIMARY KEY,
      availability numeric NOT NULL,
      failovers integer NOT NULL,
      trips integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;

  const [{ c }] = await sql`SELECT count(*)::int AS c FROM compuerta.simulations`;
  console.log(`Seeded compuerta schema: ${c} simulations`);
}

main().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
