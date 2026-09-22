import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { DIAGNOSTIC_CODES, collectDoctorChecks, deriveScaffoldDefaults, parseConfig, scaffoldConfig } from "./index.js";
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

describe("app schemas", () => {
  const sound = {
    id: "sound",
    title: { en: "Ambient sound", fr: "Son d'ambiance" },
    identifier: "id",
    display: { title: "title" },
    query: { mode: "static" }
  };

  const withSchema = (entitySchema: string | undefined, intentSchema: string | undefined, minIos = "27.0"): unknown => ({
    ...base,
    app: { ...base.app, min_ios: minIos },
    entities: entitySchema ? [{ ...sound, schema: entitySchema }] : [],
    intents: [
      {
        ...base.intents[0],
        parameters: [],
        execution: { mode: "open_app", route: "/stop" },
        ...(intentSchema ? { schema: intentSchema } : {})
      }
    ]
  });

  it("normalizes a conformed entity and intent into the IR", () => {
    const result = parseConfig(withSchema("audio.ambientSound", "camera.stopCapture"));
    expect(result.diagnostics).toEqual([]);
    expect(result.ir?.entities[0]).toMatchObject({ id: "sound", schema: "audio.ambientSound" });
    expect(result.ir?.intents[0]).toMatchObject({ id: "create_idea", schema: "camera.stopCapture" });
  });

  it("omits the schema when the contract declares none", () => {
    const result = parseConfig(withSchema(undefined, undefined));
    expect(result.ir?.entities).toEqual([]);
    expect(result.ir?.intents[0]).not.toHaveProperty("schema");
  });

  it("accepts an entity whose display properties follow the schema order", () => {
    const result = parseConfig({
      ...base,
      app: { ...base.app, min_ios: "27.0" },
      entities: [{ ...sound, display: { title: "title", subtitle: "providerName" }, schema: "audio.liveRadioStation" }],
      intents: [{ ...base.intents[0], parameters: [], execution: { mode: "open_app", route: "/stop" } }]
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.ir?.entities[0]?.displaySubtitle).toBe("providerName");
  });

  it("rejects a schema reference that is not a domain and a member", () => {
    const result = parseConfig(withSchema("audio", undefined));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "entities[0].schema", message: expect.stringContaining("'domain.member'") })
    );
  });

  it("rejects a schema reference that Xcode does not know", () => {
    const result = parseConfig(withSchema("audio.ambientSounds", undefined));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "entities[0].schema", message: expect.stringContaining("not an App Schema known to Xcode 27") })
    );
  });

  it("rejects a known schema that the generated shape cannot satisfy", () => {
    const result = parseConfig(withSchema("notes.note", "notes.createNote"));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "entities[0].schema", message: expect.stringContaining("cannot conform to it") })
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "intents[0].schema", message: expect.stringContaining("cannot conform to it") })
    );
  });

  it("rejects a schema of the other kind", () => {
    const result = parseConfig(withSchema("camera.stopCapture", "audio.ambientSound"));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "entities[0].schema", message: expect.stringContaining("of the other kind") })
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "intents[0].schema", message: expect.stringContaining("of the other kind") })
    );
  });

  it("rejects an entity whose display does not follow the schema properties", () => {
    const result = parseConfig(withSchema("audio.liveRadioStation", undefined));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "entities[0].schema", message: expect.stringContaining("'providerName'") })
    );
  });

  it("rejects an intent that declares a parameter under a schema", () => {
    const result = parseConfig({
      ...base,
      app: { ...base.app, min_ios: "27.0" },
      intents: [{ ...base.intents[0], execution: { mode: "open_app", route: "/stop" }, schema: "camera.stopCapture" }]
    });
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "intents[0].parameters", message: expect.stringContaining("must declare none") })
    );
  });

  it("rejects a return value under a schema", () => {
    const result = parseConfig({
      ...base,
      app: { ...base.app, min_ios: "27.0" },
      entities: [sound],
      intents: [
        {
          ...base.intents[0],
          parameters: [],
          execution: { mode: "native", handler: "StopCaptureHandler" },
          result: { returns: "sound" },
          schema: "camera.stopCapture"
        }
      ]
    });
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "intents[0].result.returns" })
    );
  });

  it("rejects a schema that needs a newer iOS than the app declares", () => {
    const result = parseConfig(withSchema("audio.ambientSound", "camera.stopCapture", "18.0"));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "entities[0].schema", message: expect.stringContaining("requires iOS 27") })
    );
    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({ path: "intents[0].schema" })
    );
  });
});

describe("schema protocols", () => {
  const page = {
    id: "page",
    title: { en: "Page", fr: "Page" },
    identifier: "id",
    display: { title: "label" },
    query: { mode: "static" },
    schema: "reader.page"
  };

  const withProtocol = (overrides: Record<string, unknown> = {}): unknown => ({
    ...base,
    app: { ...base.app, min_ios: "27.0" },
    entities: [page],
    intents: [
      {
        ...base.intents[0],
        parameters: [],
        execution: { mode: "native" },
        schema: "reader.openPage",
        target: "page",
        ...overrides
      }
    ]
  });

  it("normalizes a protocol intent and its target into the IR", () => {
    const result = parseConfig(withProtocol());
    expect(result.diagnostics).toEqual([]);
    expect(result.ir?.intents[0]).toMatchObject({ mode: "native", schema: "reader.openPage", target: "page" });
  });

  it("accepts a delete schema once the intent declares a handler", () => {
    const result = parseConfig(withProtocol({ schema: "reader.deletePages", execution: { mode: "native", handler: "DeletePagesHandler" } }));
    expect(result.diagnostics).toEqual([]);
    expect(result.ir?.intents[0]).toMatchObject({ handler: "DeletePagesHandler", target: "page" });
  });

  it("requires a target on a protocol schema", () => {
    const result = parseConfig(withProtocol({ target: undefined }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "intents[0].target", message: expect.stringContaining("target") })
    );
  });

  it("rejects a target that names no entity", () => {
    const result = parseConfig(withProtocol({ target: "missing" }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "intents[0].target", message: expect.stringContaining("missing") })
    );
  });

  it("rejects a protocol schema that is not native", () => {
    const result = parseConfig(withProtocol({ execution: { mode: "open_app", route: "/pages" } }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "intents[0].execution.mode", message: expect.stringContaining("native") })
    );
  });

  it("rejects a target on a schema without a protocol", () => {
    const result = parseConfig(withProtocol({ schema: "camera.stopCapture" }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "intents[0].target" })
    );
  });

  it("rejects a declared result on a protocol schema", () => {
    const result = parseConfig(withProtocol({ result: { dialog: { en: "Done", fr: "Termine" } } }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "intents[0].result" })
    );
  });

  it("normalizes an entity list parameter into the IR", () => {
    const result = parseConfig({
      ...base,
      entities: [page],
      intents: [
        {
          ...base.intents[0],
          parameters: [{ id: "pages", type: "entity_list", required: true, entity: "page" }],
          execution: { mode: "native", handler: "RotatePagesHandler" }
        }
      ]
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.ir?.intents[0]?.parameters[0]).toMatchObject({ id: "pages", type: "entity_list", entity: "page" });
  });

  it("requires an entity reference on an entity list parameter", () => {
    const result = parseConfig({
      ...base,
      entities: [page],
      intents: [
        {
          ...base.intents[0],
          parameters: [{ id: "pages", type: "entity_list", required: true }],
          execution: { mode: "native", handler: "RotatePagesHandler" }
        }
      ]
    });
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1301", path: "intents[0].parameters[0].entity" })
    );
  });

  it("rejects an unknown entity on an entity list parameter", () => {
    const result = parseConfig({
      ...base,
      entities: [page],
      intents: [
        {
          ...base.intents[0],
          parameters: [{ id: "pages", type: "entity_list", required: true, entity: "missing" }],
          execution: { mode: "native", handler: "RotatePagesHandler" }
        }
      ]
    });
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1301", path: "intents[0].parameters[0].entity" })
    );
  });
});

describe("schema parameters", () => {
  const page = {
    id: "page",
    title: { en: "Page", fr: "Page" },
    identifier: "id",
    display: { title: "label" },
    query: { mode: "static" },
    schema: "reader.page"
  };

  const withRotate = (overrides: Record<string, unknown> = {}): unknown => ({
    ...base,
    app: { ...base.app, min_ios: "27.0" },
    entities: [page],
    intents: [
      {
        ...base.intents[0],
        parameters: [],
        execution: { mode: "native", handler: "RotatePagesHandler" },
        schema: "reader.rotatePages",
        target: "page",
        ...overrides
      }
    ]
  });

  it("accepts a schema that supplies its own parameters", () => {
    const result = parseConfig(withRotate());
    expect(result.diagnostics).toEqual([]);
    expect(result.ir?.intents[0]).toMatchObject({ mode: "native", schema: "reader.rotatePages", target: "page" });
  });

  it("requires a target on a parameter schema", () => {
    const result = parseConfig(withRotate({ target: undefined }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "intents[0].target" })
    );
  });

  it("requires native execution on a parameter schema", () => {
    const result = parseConfig(withRotate({ execution: { mode: "open_app", route: "/rotate" } }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "intents[0].execution.mode" })
    );
  });

  it("rejects a declared result on a parameter schema", () => {
    const result = parseConfig(withRotate({ result: { dialog: { en: "Done", fr: "Termine" } } }));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "IL1401", path: "intents[0].result" })
    );
  });
});

describe("diagnostic codes", () => {
  it("publishes the documented contract in order", () => {
    expect([...DIAGNOSTIC_CODES]).toEqual([
      "IL1001",
      "IL1101",
      "IL1201",
      "IL1301",
      "IL1401",
      "IL1501",
      "IL1601",
      "IL1701"
    ]);
  });
});
