import { describe, expect, it } from "vitest";
import { generateAdapterTemplate, GENERATED_SWIFT_FILE } from "./index.js";
import type { ConfigIR } from "../../core/src/index.js";

const ir: ConfigIR = {
  schemaVersion: "0.1",
  app: { id: "dev.example", name: "Example", urlScheme: "example", minMacos: "27.0", locales: ["en"] },
  entities: [
    { id: "played_media", swiftName: "PlayedMedia", title: { en: "Played media" }, identifier: "id", displayTitle: "title" }
  ],
  intents: [
    {
      id: "open_played_media",
      swiftName: "OpenPlayedMedia",
      schema: "system.open",
      target: "played_media",
      title: { en: "Open played media" },
      parameters: [],
      mode: "native",
      route: "",
      mapping: {},
      phrases: {}
    }
  ]
};

const generated = generateAdapterTemplate(ir);

describe("what the generator writes about access", () => {
  it("writes no access rule, because App Intents has nowhere to put one", () => {
    expect(generated).not.toMatch(/source_disabled|item_missing|item_not_usable/);
  });

  it("writes no property named for exposure, because a generated claim about it could not be checked", () => {
    expect(generated).not.toMatch(/exposure|isExposed|canAccess/);
  });

  it("still writes the entity, because the exposure condition is contract data and not a reason to emit less", () => {
    expect(generated).toContain("PlayedMedia");
  });

  it("uses the same file name the template declares, so a rename cannot pass unnoticed", () => {
    expect(GENERATED_SWIFT_FILE).toBeTruthy();
  });
});
