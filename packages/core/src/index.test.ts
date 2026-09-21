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

  it("rejects the entity type with a capability diagnostic", () => {
    const result = parseConfig(withParameters([{ id: "idea", type: "entity", required: true }]));
    expect(result.ir).toBeUndefined();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "IL1401", path: "intents[0].parameters[0].type" }));
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
});
