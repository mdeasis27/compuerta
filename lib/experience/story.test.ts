import { describe, expect, it } from "vitest";
import { STORY } from "./story";

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") return [String((value as (a: number, b: number) => string)(27, 18)), String((value as (a: number, b: number) => string)(18, 18)), String((value as (a: number, b: number) => string)(19, 18))];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

const FORBIDDEN = [/—/, /\bsino\b/i, /en lugar de/i, /\bnot just\b/i, /\binstead of\b/i, /potenciar/i, /robust/i, /de un vistazo/i, /at a glance/i, /seamless/i, /leverag/i, /\bWaze\b/i];

describe("Compuerta story copy", () => {
  it("has the same shape in English and Spanish", () => {
    // Heading.before/after are optional word-order slots that legitimately differ between languages.
    const keys = (o: unknown): string[] => o && typeof o === "object" && !Array.isArray(o) ? Object.entries(o).filter(([k]) => k !== "before" && k !== "after").flatMap(([k, v]) => [k, ...keys(v).map(x => `${k}.${x}`)]) : [];
    expect(keys(STORY.es)).toEqual(keys(STORY.en));
    expect(STORY.es.analogy.dictionary).toHaveLength(STORY.en.analogy.dictionary.length);
  });

  it("has no empty strings except the owner-supplied why note", () => {
    for (const locale of ["en", "es"] as const) {
      const { why, ...rest } = STORY[locale];
      expect(why.title.trim()).not.toBe("");
      for (const s of strings(rest)) expect(s.trim(), `${locale}: empty string`).not.toBe("");
    }
  });

  it("avoids AI-sounding patterns and brand names", () => {
    for (const locale of ["en", "es"] as const) for (const s of strings(STORY[locale])) for (const pattern of FORBIDDEN) expect(s, `${locale}: ${pattern}`).not.toMatch(pattern);
  });

  it("states the comparison truthfully, including ties and a single person", () => {
    expect(STORY.es.compare.sentence(27, 18)).toBe("Con respaldo se atendió a 27 clientes. Sin respaldo, a 18. Son 9 personas que se quedaron viendo un \"intenta más tarde\".");
    expect(STORY.es.compare.sentence(19, 18)).toContain("Es una persona que se quedó");
    expect(STORY.es.compare.sentence(18, 18)).toBe("Las dos configuraciones atendieron a 18 clientes. Esta caída fue demasiado corta para notar la diferencia.");
    expect(STORY.en.compare.sentence(27, 18)).toBe("With the backup, 27 customers were served. Without it, 18. That's 9 people staring at a \"try again later\".");
    expect(STORY.en.compare.sentence(19, 18)).toContain("That's one person");
    expect(STORY.en.compare.sentence(18, 18)).toBe("Both setups served 18 customers. This outage was too short to make a difference.");
  });
});
