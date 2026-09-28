import { describe, expect, it } from "vitest";
import { parseConfig } from "./index.js";

// The notes domain is only correct if the wrong shapes are refused. Each case
// below is a shape Apple refuses, either at the metadata processor or at the type
// checker, and each one is a shape a client will write by accident.

const app = { id: "dev.intentlane.notes", name: "Notes", url_scheme: "notes", min_ios: "27.0", locales: ["en", "fr"] };

function entity(id: string, schema: string, display: Record<string, string>): unknown {
  return { id, title: { en: id, fr: id }, identifier: "id", display, query: { mode: "static" }, exposure: { rules: ["item_not_usable"] }, schema };
}

const account = entity("account", "notes.account", { title: "name" });
const folder = entity("folder", "notes.folder", { title: "name" });
const note = entity("note", "notes.note", { title: "name", subtitle: "content" });

function intent(id: string, schema: string, target?: string): unknown {
  return {
    id,
    title: { en: id, fr: id },
    execution: { mode: "native", handler: "Handler" },
    schema,
    ...(target === undefined ? {} : { target })
  };
}

function contract(overrides: { entities?: unknown[]; intents?: unknown[]; app?: Record<string, unknown> } = {}): unknown {
  return {
    schema: "0.1",
    app: { ...app, ...(overrides.app ?? {}) },
    entities: overrides.entities ?? [account, folder, note],
    intents: overrides.intents ?? [intent("create_note", "notes.createNote")]
  };
}

describe("notes domain refusals", () => {
  it("accepts the creating shape, with every entity the schema names", () => {
    const result = parseConfig(contract());
    expect(result.diagnostics).toEqual([]);
    expect(result.ir?.intents[0]).toMatchObject({ schema: "notes.createNote" });
  });

  it("refuses a target on a creating schema", () => {
    const result = parseConfig(contract({ intents: [intent("create_note", "notes.createNote", "note")] }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "intents[0].target" })
    );
  });

  it("does not describe a creating schema as an in-app search", () => {
    const result = parseConfig(contract({ intents: [intent("create_note", "notes.createNote", "note")] }));
    const message = result.diagnostics.find((item) => item.path === "intents[0].target")?.message ?? "";
    expect(message).not.toContain("searches within the app");
    expect(message).toContain("names no target entity");
  });

  it("refuses the contract when a schema names an entity the contract omits", () => {
    const result = parseConfig(contract({ entities: [account, note], intents: [intent("append", "notes.appendText", "note")] }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", message: expect.stringContaining("'notes.folder'") })
    );
  });

  it("refuses a target that names an unknown entity", () => {
    const result = parseConfig(contract({ intents: [intent("append", "notes.appendText", "missing")] }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "intents[0].target", message: expect.stringContaining("unknown entity 'missing'") })
    );
  });

  it("refuses a notes schema on a Mac Catalyst target", () => {
    const result = parseConfig(contract({ app: { mac_catalyst: true } }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", message: expect.stringContaining("'macCatalyst'") })
    );
  });

  it("refuses a notes schema below iOS 27", () => {
    const result = parseConfig(contract({ app: { min_ios: "26.0" } }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", message: expect.stringContaining("requires iOS 27") })
    );
  });

  it("refuses a display property the schema does not declare, in that order", () => {
    const result = parseConfig(contract({ entities: [account, folder, entity("note", "notes.note", { title: "folder" })] }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "entities[2].schema", message: expect.stringContaining("'name'") })
    );
  });

  it("refuses a contract parameter under a schema that supplies its own", () => {
    const result = parseConfig(contract({
      intents: [{ ...(intent("create_note", "notes.createNote") as object), parameters: [{ id: "name", type: "string", required: true }] }]
    }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "intents[0].parameters", message: expect.stringContaining("must declare none") })
    );
  });

  it("refuses a result under a schema that supplies its own", () => {
    const result = parseConfig(contract({
      intents: [{ ...(intent("create_note", "notes.createNote") as object), result: { dialog: { en: "Done", fr: "Termine" } } }]
    }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "intents[0].result" })
    );
  });

  it("refuses a non-native execution under a schema that takes parameters", () => {
    const result = parseConfig(contract({
      intents: [{ id: "create_note", title: { en: "Create", fr: "Creer" }, execution: { mode: "open_app", route: "/n" }, schema: "notes.createNote" }]
    }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "intents[0].execution.mode" })
    );
  });
});
