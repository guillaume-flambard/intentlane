import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { collectDoctorChecks, deriveScaffoldDefaults, parseConfig, scaffoldConfig } from "./index.js";
import type { DoctorFacts } from "./index.js";

const base = {
  schema: "0.1",
  app: { id: "dev.intentlane.example", name: "Example", url_scheme: "example", min_ios: "18.0", locales: ["en", "fr"] },
  intents: [{
    id: "create_idea",
    title: { en: "Create an idea", fr: "Créer une idée" },
    parameters: [{ id: "title", type: "string", required: true }],
    execution: { mode: "open_app", route: "/ideas/new", mapping: { title: "title" } }
  }]
};

describe("parseConfig", () => {
  it("normalizes a valid configuration into deterministic IR", () => {
    const result = parseConfig(base);
    expect(result.diagnostics).toEqual([]);
    expect(result.ir?.intents[0]).toMatchObject({ id: "create_idea", swiftName: "CreateIdea", route: "/ideas/new" });
  });

  it("reports an actionable diagnostic for an unsafe destructive intent", () => {
    const result = parseConfig({ ...base, intents: [{ ...base.intents[0], risk: { level: "destructive", confirmation: "optional", authentication: "required" } }] });
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "IL1501", path: "intents[0].risk.confirmation" }));
  });

  it("rejects invalid identifiers before code generation", () => {
    const result = parseConfig({ ...base, intents: [{ ...base.intents[0], id: "Create-Idea" }] });
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics[0]).toMatchObject({ code: "IL1101", path: "intents.0.id" });
  });
});

describe("scaffoldConfig", () => {
  it("emits a deterministic config that parses cleanly", () => {
    const source = scaffoldConfig({ appId: "dev.intentlane.example", appName: "Example", urlScheme: "example" });
    expect(source).toBe(scaffoldConfig({ appId: "dev.intentlane.example", appName: "Example", urlScheme: "example" }));
    expect(source.endsWith("\n")).toBe(true);
    const result = parseConfig(parse(source) as unknown);
    expect(result.diagnostics).toEqual([]);
    expect(result.ir?.intents.map((intent) => intent.id)).toEqual(["create_note", "open_home"]);
  });
});

describe("deriveScaffoldDefaults", () => {
  it("derives a stable identifier, name and scheme from the project folder", () => {
    expect(deriveScaffoldDefaults({ directoryName: "My-Cool-App" })).toEqual({ appId: "com.example.mycoolapp", appName: "My Cool App", urlScheme: "mycoolapp" });
  });
});

describe("collectDoctorChecks", () => {
  const facts: DoctorFacts = {
    nodeVersion: "v22.0.0",
    configFile: "intentlane.yaml",
    configExists: true,
    diagnostics: [],
    schemaVersion: "0.1",
    intentCount: 1,
    generatedStatus: "fresh",
    platform: "darwin",
    xcrunAvailable: true,
    swiftcAvailable: true,
    pluginDeclared: true
  };

  it("reports a healthy environment", () => {
    expect(collectDoctorChecks(facts).every((check) => check.status === "ok")).toBe(true);
  });

  it("fails on an outdated runtime and a missing iOS toolchain", () => {
    const checks = collectDoctorChecks({ ...facts, nodeVersion: "v18.19.0", xcrunAvailable: false });
    expect(checks.find((check) => check.id === "node")?.status).toBe("error");
    expect(checks.find((check) => check.id === "xcode")?.status).toBe("error");
  });

  it("warns about stale generation without failing the run", () => {
    const checks = collectDoctorChecks({ ...facts, generatedStatus: "stale" });
    expect(checks.find((check) => check.id === "generated")?.status).toBe("warning");
    expect(checks.every((check) => check.status !== "error")).toBe(true);
  });
});

describe("parameter types", () => {
  const withParameters = (parameters: unknown): unknown => ({
    ...base,
    intents: [{ ...base.intents[0], parameters, execution: { mode: "open_app", route: "/ideas/new" } }]
  });

  it("requires at least one value on an enum parameter", () => {
    const result = parseConfig(withParameters([{ id: "priority", type: "enum", required: true }]));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "IL1301", path: "intents[0].parameters[0].values" }));
  });

  it("rejects values on a parameter that is not an enum", () => {
    const result = parseConfig(withParameters([{ id: "title", type: "string", required: true, values: { low: { en: "Low" } } }]));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "IL1301", path: "intents[0].parameters[0].values" }));
  });

  it("normalizes enum values into the IR", () => {
    const result = parseConfig(withParameters([{ id: "priority", type: "enum", required: true, values: { low: { en: "Low", fr: "Basse" } } }]));
    expect(result.diagnostics).toEqual([]);
    expect(result.ir?.intents[0]?.parameters[0]).toMatchObject({ id: "priority", type: "enum", values: { low: { en: "Low", fr: "Basse" } } });
  });

  it("errors when an enum label misses its default locale", () => {
    const result = parseConfig(withParameters([{ id: "priority", type: "enum", required: true, values: { low: { fr: "Basse" } } }]));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "IL1201", path: "intents[0].parameters[0].values.low" }));
  });

  it("accepts every non-enum primitive type", () => {
    const types = ["string", "integer", "number", "boolean", "date", "datetime"];
    const result = parseConfig(withParameters(types.map((type, index) => ({ id: `value_${index}`, type, required: false }))));
    expect(result.diagnostics).toEqual([]);
    expect(result.ir?.intents[0]?.parameters.map((parameter) => parameter.type)).toEqual(types);
  });

  it("normalizes a localized parameter title into the IR", () => {
    const result = parseConfig(withParameters([
      { id: "title", type: "string", required: true, title: { en: "Idea title", fr: "Titre de l'idée" }, prompt: { en: "What is the idea?", fr: "Quelle est l'idée ?" } }
    ]));
    expect(result.diagnostics).toEqual([]);
    expect(result.ir?.intents[0]?.parameters[0]).toMatchObject({
      title: { en: "Idea title", fr: "Titre de l'idée" },
      prompt: { en: "What is the idea?", fr: "Quelle est l'idée ?" }
    });
  });

  it("omits the title when the contract declares none", () => {
    const result = parseConfig(withParameters([{ id: "title", type: "string", required: true }]));
    expect(result.diagnostics).toEqual([]);
    expect(result.ir?.intents[0]?.parameters[0]).not.toHaveProperty("title");
  });

  it("errors when a parameter title misses its default locale", () => {
    const result = parseConfig(withParameters([{ id: "title", type: "string", required: true, title: { fr: "Titre de l'idée" } }]));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "IL1201", path: "intents[0].parameters[0].title" }));
  });

  it("warns when a parameter title misses a secondary locale", () => {
    const result = parseConfig(withParameters([{ id: "title", type: "string", required: true, title: { en: "Idea title" } }]));
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "IL1201", severity: "warning", path: "intents[0].parameters[0].title" }));
    expect(result.ir?.intents[0]?.parameters[0]).toMatchObject({ title: { en: "Idea title" } });
  });
});

describe("entities", () => {
  const idea = {
    id: "idea",
    title: { en: "Idea", fr: "Idée" },
    identifier: "id",
    display: { title: "title", subtitle: "status" },
    query: { mode: "static" }
  };

  const withEntities = (entities: unknown, parameters: unknown = []): unknown => ({
    ...base,
    entities,
    intents: [{ ...base.intents[0], parameters, execution: { mode: "open_app", route: "/ideas/new" } }]
  });

  it("projects entities into the IR in canonical order", () => {
    const result = parseConfig(withEntities([{ ...idea, id: "zeta" }, idea]));
    expect(result.diagnostics).toEqual([]);
    expect(result.ir?.entities.map((entity) => entity.id)).toEqual(["idea", "zeta"]);
    expect(result.ir?.entities[0]).toMatchObject({ swiftName: "Idea", identifier: "id", displayTitle: "title", displaySubtitle: "status" });
  });

  it("omits the subtitle when the contract does not declare one", () => {
    const result = parseConfig(withEntities([{ ...idea, display: { title: "title" } }]));
    expect(result.diagnostics).toEqual([]);
    expect(result.ir?.entities[0]).not.toHaveProperty("displaySubtitle");
  });

  it("rejects an endpoint query with a capability diagnostic", () => {
    const result = parseConfig(withEntities([{ ...idea, query: { mode: "endpoint", endpoint: "/api/ideas" } }]));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "IL1401", path: "entities[0].query.mode" }));
  });

  it("rejects the same entity id twice", () => {
    const result = parseConfig(withEntities([idea, { ...idea }]));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "IL1601", path: "entities[1].id" }));
  });

  it("rejects two entities that produce the same Swift type name", () => {
    const result = parseConfig(withEntities([{ ...idea, id: "a_b" }, { ...idea, id: "a__b" }]));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "IL1601", path: "entities[1].id" }));
  });

  it("errors when an entity title misses its default locale", () => {
    const result = parseConfig(withEntities([{ ...idea, title: { fr: "Idée" } }]));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "IL1201", path: "entities[0].title" }));
  });

  it("requires an entity reference on entity parameters", () => {
    const result = parseConfig(withEntities([idea], [{ id: "related", type: "entity", required: false }]));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "IL1301", path: "intents[0].parameters[0].entity" }));
  });

  it("rejects an unknown entity reference", () => {
    const result = parseConfig(withEntities([idea], [{ id: "related", type: "entity", required: false, entity: "missing" }]));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "IL1301", path: "intents[0].parameters[0].entity" }));
  });

  it("rejects an entity reference on a parameter that is not an entity", () => {
    const result = parseConfig(withEntities([idea], [{ id: "title", type: "string", required: true, entity: "idea" }]));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "IL1301", path: "intents[0].parameters[0].entity" }));
  });

  it("normalizes the entity reference into the IR", () => {
    const result = parseConfig(withEntities([idea], [{ id: "related", type: "entity", required: false, entity: "idea" }]));
    expect(result.diagnostics).toEqual([]);
    expect(result.ir?.intents[0]?.parameters[0]).toMatchObject({ id: "related", type: "entity", entity: "idea" });
  });
});

const withRisk = (risk: unknown) => ({
  ...base,
  intents: [{ ...base.intents[0], risk }]
});

describe("risk policy", () => {
  it("normalizes the declared risk policy into the IR", () => {
    const result = parseConfig(withRisk({
      level: "destructive",
      confirmation: "always",
      authentication: "required",
      confirmation_prompt: { en: "Delete this idea?", fr: "Supprimer cette idée ?" }
    }));
    expect(result.diagnostics).toEqual([]);
    expect(result.ir?.intents[0]?.risk).toEqual({
      level: "destructive",
      confirmation: "always",
      authentication: "required",
      confirmationPrompt: { en: "Delete this idea?", fr: "Supprimer cette idée ?" }
    });
  });

  it("omits the confirmation prompt when the contract declares none", () => {
    const result = parseConfig(withRisk({ level: "write", confirmation: "optional", authentication: "inherited" }));
    expect(result.diagnostics).toEqual([]);
    expect(result.ir?.intents[0]?.risk).not.toHaveProperty("confirmationPrompt");
  });

  it("reports a confirmation prompt that misses its default locale", () => {
    const result = parseConfig(withRisk({
      level: "destructive",
      confirmation: "always",
      authentication: "required",
      confirmation_prompt: { fr: "Supprimer cette idée ?" }
    }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "IL1201", path: "intents[0].risk.confirmation_prompt" }));
  });
});

const nativeEntity = {
  id: "note",
  title: { en: "Note", fr: "Note" },
  identifier: "id",
  display: { title: "title" },
  query: { mode: "static" }
};

const withNative = (overrides: Record<string, unknown> = {}) => ({
  ...base,
  entities: [nativeEntity],
  intents: [
    {
      ...base.intents[0],
      parameters: [],
      execution: { mode: "native", handler: "CreateNoteHandler", ...overrides }
    }
  ]
});

describe("native execution", () => {
  it("normalizes native execution and its return value into the IR", () => {
    const result = parseConfig({
      ...withNative(),
      intents: [{ ...withNative().intents[0], result: { dialog: { en: "Created", fr: "Créée" }, returns: "note" } }]
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.ir?.intents[0]).toMatchObject({ mode: "native", handler: "CreateNoteHandler", returns: "note" });
  });

  it("requires a handler on a native intent", () => {
    const result = parseConfig(withNative({ handler: undefined }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1301", path: "intents[0].execution.handler" })
    );
  });

  it("requires the handler to be a Swift type name", () => {
    const result = parseConfig(withNative({ handler: "create_note_handler" }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1301", path: "intents[0].execution.handler" })
    );
  });

  it("rejects a handler declared by more than one intent", () => {
    const config = withNative();
    const result = parseConfig({
      ...config,
      intents: [config.intents[0], { ...config.intents[0], id: "archive_note" }]
    });
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1601", path: "intents[1].execution.handler" })
    );
  });

  it("rejects a route on a native intent", () => {
    const result = parseConfig(withNative({ route: "/notes/new" }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1301", path: "intents[0].execution.route" })
    );
  });

  it("rejects a mapping on a native intent", () => {
    const result = parseConfig(withNative({ mapping: { title: "title" } }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1301", path: "intents[0].execution.mapping" })
    );
  });

  it("rejects a handler on an open_app intent", () => {
    const result = parseConfig({
      ...base,
      intents: [{ ...base.intents[0], execution: { mode: "open_app", route: "/ideas/new", handler: "CreateIdeaHandler" } }]
    });
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1301", path: "intents[0].execution.handler" })
    );
  });

  it("rejects a return value on an open_app intent", () => {
    const result = parseConfig({
      ...base,
      entities: [nativeEntity],
      intents: [{ ...base.intents[0], result: { returns: "note" } }]
    });
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1301", path: "intents[0].result.returns" })
    );
  });

  it("rejects a return value that references an unknown entity", () => {
    const config = withNative();
    const result = parseConfig({
      ...config,
      intents: [{ ...config.intents[0], result: { returns: "missing" } }]
    });
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1301", path: "intents[0].result.returns" })
    );
  });

  it("reports http execution as not generated yet", () => {
    const result = parseConfig({
      ...base,
      intents: [{ ...base.intents[0], execution: { mode: "http" } }]
    });
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "intents[0].execution.mode" })
    );
  });
});
