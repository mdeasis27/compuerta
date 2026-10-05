import { describe, expect, it } from "vitest";
import { STORY } from "./story";
import { lintStory, storyStrings as strings } from "@/design-system/demo/copy-lint";

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
    for (const locale of ["en", "es"] as const) expect(lintStory(STORY[locale]), locale).toEqual([]);
  });

  it("states the comparison truthfully, including ties and a single person", () => {
    expect(STORY.es.compare.sentence(27, 18)).toBe("Con respaldo se atendió a 27 clientes. Sin respaldo, a 18. Son 9 personas que se quedaron viendo un \"intenta más tarde\".");
    expect(STORY.es.compare.sentence(19, 18)).toContain("Es una persona que se quedó");
    expect(STORY.es.compare.sentence(18, 18)).toBe("Las dos configuraciones atendieron a 18 clientes. Esta caída fue demasiado corta para notar la diferencia.");
    expect(STORY.en.compare.sentence(27, 18)).toBe("With the backup, 27 customers were served. Without it, 18. That's 9 people staring at a \"try again later\".");
    expect(STORY.en.compare.sentence(19, 18)).toContain("That's one person");
    expect(STORY.es.compare.sentence(17, 18)).toBe("Esta vez el respaldo atendió a menos: 17 clientes con él y 18 sin él.");
    expect(STORY.en.compare.sentence(17, 18)).toBe("This time the backup served fewer: 17 customers with it, 18 without it.");
    expect(STORY.en.compare.sentence(18, 18)).toBe("Both setups served 18 customers. This outage was too short to make a difference.");
  });

  it("asks the bet about the outage and backup the visitor actually chose", () => {
    expect(STORY.en.tryIt.question(28, false)).toContain("without the backup route and an outage from request 8 to 28");
    expect(STORY.es.tryIt.question(12, true)).toContain("con la ruta de respaldo y con una caída de la solicitud 8 a la 12");
  });
});
