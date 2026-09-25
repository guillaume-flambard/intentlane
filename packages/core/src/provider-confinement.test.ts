import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PROVIDER_SYMBOLS = [
  "LanguageModelSession",
  "SystemLanguageModel",
  "Generable",
  "@Tool",
  "AppIntent",
  "Noul",
  "SystemOneRequest",
  "choices_max",
  "gev"
] as const;

const schemaSource = readFileSync(new URL("../../schema/src/index.ts", import.meta.url), "utf8");

describe("provider types staying out of the domain", () => {
  it.each(PROVIDER_SYMBOLS)("keeps the provider symbol '%s' out of the schema", (symbol) => {
    expect(schemaSource).not.toContain(symbol);
  });

  it("keeps the claim confidence portable, carrying only a number and a distribution", () => {
    expect(schemaSource).toMatch(/claimConfidenceSchema/);
    expect(schemaSource).not.toMatch(/import .*(apple|typesafe|jev)/i);
  });
});
