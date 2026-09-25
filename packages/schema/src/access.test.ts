import { describe, expect, it } from "vitest";
import { intentLaneConfigSchema } from "./index.js";

const base = {
  schema: "0.1" as const,
  app: { id: "dev.example", name: "Example", url_scheme: "example", min_ios: "18.0", locales: ["en"] },
  intents: [
    {
      id: "open_home",
      title: { en: "Open" },
      parameters: [],
      execution: { mode: "open_app" as const, route: "/" }
    }
  ]
};

function entity(extra: Readonly<Record<string, unknown>>) {
  return {
    ...base,
    entities: [
      {
        id: "played_media",
        title: { en: "Played media" },
        identifier: "id",
        display: { title: "title" },
        query: { mode: "static" },
        ...extra
      }
    ]
  };
}

function parsed(extra: Readonly<Record<string, unknown>>) {
  return intentLaneConfigSchema.safeParse(entity(extra));
}

describe("the exposure condition of an entity", () => {
  it("accepts a condition that withholds exposure while the source is switched off", () => {
    expect(parsed({ exposure: { rules: ["source_disabled"] } }).success).toBe(true);
  });

  it("keeps the rule verbatim, because the contract is the document a client reads", () => {
    const document = parsed({ exposure: { rules: ["source_disabled"] } });
    expect(document.success && document.data.entities[0]?.exposure?.rules).toEqual(["source_disabled"]);
  });

  it("accepts the rule that withholds exposure when the item is gone", () => {
    expect(parsed({ exposure: { rules: ["item_missing"] } }).success).toBe(true);
  });

  it("accepts the rule that withholds exposure when the item exists but must not be read", () => {
    expect(parsed({ exposure: { rules: ["item_not_usable"] } }).success).toBe(true);
  });

  it("accepts more than one rule, because a pilot can withhold for two independent reasons at once", () => {
    expect(parsed({ exposure: { rules: ["source_disabled", "item_missing"] } }).success).toBe(true);
  });

  it("preserves the order of the rules, so the contract reads the way the decision is made", () => {
    const document = parsed({ exposure: { rules: ["item_missing", "source_disabled"] } });
    expect(document.success && document.data.entities[0]?.exposure?.rules).toEqual(["item_missing", "source_disabled"]);
  });

  it("rejects an entity that declares no condition, because an always-exposed entity is a different offer", () => {
    expect(parsed({}).success).toBe(false);
  });

  it("says which field is missing, because a reader has to act on the message without reading the schema", () => {
    const document = parsed({});
    const paths = document.success ? [] : document.error.issues.map((issue) => issue.path.join("."));
    expect(paths).toContain("entities.0.exposure");
  });

  it("rejects a condition naming no rule, rather than reading it as always exposed", () => {
    expect(parsed({ exposure: { rules: [] } }).success).toBe(false);
  });

  it("rejects a condition naming a rule this version does not know", () => {
    expect(parsed({ exposure: { rules: ["ask_nice"] } }).success).toBe(false);
  });

  it("rejects the same rule twice, because a repeated rule reads as a conjunction that means something stronger", () => {
    expect(parsed({ exposure: { rules: ["item_missing", "item_missing"] } }).success).toBe(false);
  });

  it("rejects the singular form this version does not use, so an old draft cannot pass by accident", () => {
    expect(parsed({ exposure: { rule: "source_disabled" } }).success).toBe(false);
  });
});
