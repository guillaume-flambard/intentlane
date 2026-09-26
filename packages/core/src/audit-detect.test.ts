import { describe, expect, it } from "vitest";
import {
  MODEL_BINDING_SHAPES,
  describeModelBinding,
  type AuditSourceFile
} from "./audit-detect.js";

function source(...lines: readonly string[]): AuditSourceFile {
  return { path: "Sources/App/Model.swift", contents: lines.join("\n") };
}

describe("model binding", () => {
  it("does not read a concrete Apple model as a mention of the protocol", () => {
    // `SystemLanguageModel` ends with `LanguageModel`. Without a leading word
    // boundary the protocol would look present in a plainly bound app, and the
    // audit would tell a client it is abstracted when it is not.
    const binding = describeModelBinding([source("let model = SystemLanguageModel.default")]);

    expect(binding).toEqual({ shape: "bound-apple-local", protocol: false, appleLocal: true, appleCloud: false });
  });

  it("separates a cloud escalation from a local call", () => {
    expect(describeModelBinding([source("let model = PrivateCloudComputeLanguageModel()")]).shape).toBe("bound-apple-cloud");
    expect(describeModelBinding([source("let model = SystemLanguageModel.default")]).shape).toBe("bound-apple-local");
  });

  it("calls an app that abstracts behind the protocol over a third-party model abstracted", () => {
    const binding = describeModelBinding([
      source("struct Remote: LanguageModel { }", "let session = LanguageModelSession(model: Remote())")
    ]);

    expect(binding).toEqual({ shape: "abstracted-third-party", protocol: true, appleLocal: false, appleCloud: false });
  });

  it("keeps local-first with a seam distinct from a plainly bound app", () => {
    // The architecture Apple sanctioned in WWDC26 session 339: abstract over the
    // protocol, default to the Apple model. Calling this "mixed" would discard
    // the only fact a client wants, which is that the app is not locked.
    const binding = describeModelBinding([
      source("struct Remote: LanguageModel { }", "let model: any LanguageModel = SystemLanguageModel.default")
    ]);

    expect(binding.shape).toBe("abstracted-over-apple");
    expect(binding).toEqual({ shape: "abstracted-over-apple", protocol: true, appleLocal: true, appleCloud: false });
  });

  it("reports an app that names no model at all as absent rather than guessing", () => {
    expect(describeModelBinding([source("struct CreateNote: AppIntent { }")]).shape).toBe("absent");
  });

  it("names its shapes once, and none of them is an audit state", () => {
    expect([...MODEL_BINDING_SHAPES]).toEqual([
      "absent",
      "bound-apple-local",
      "bound-apple-cloud",
      "abstracted-third-party",
      "abstracted-over-apple"
    ]);
  });
});

describe("the models signatures", () => {
  it("detects a models capability only on the symbol that names it", () => {
    const detected = detectSources([
      source("let model = SystemLanguageModel.default", "let tool = OCRTool()", "let options = GenerationOptions()")
    ]).map((detection) => detection.capability);

    expect(new Set(detected)).toEqual(
      new Set(["models.system-language-model", "models.ocr-tool", "models.generation-options"])
    );
    // A bound app does not thereby claim the protocol, nor the bridge tool of
    // the other framework.
    expect(detected).not.toContain("models.language-model");
    expect(detected).not.toContain("models.spotlight-search-tool");
  });

  it("detects the bridge tools in the framework that actually declares them", () => {
    const detected = detectSources([source("let ocr = OCRTool()", "let search = SpotlightSearchTool()")]).map(
      (detection) => detection.capability
    );

    expect(detected).toContain("models.ocr-tool");
    expect(detected).toContain("models.spotlight-search-tool");
  });
});
import {
  completeSchemaDomains,
  detectSchemaDomains,
  detectSources,
  detectedCapabilities,
  evidenceFor,
  hasSchemaEvidence,
  partialSchemaDomains
} from "./audit-detect.js";

const providerOnly = {
  path: "Sources/App/Shortcuts.swift",
  contents: [
    "import AppIntents",
    "",
    "struct Shortcuts: AppShortcutsProvider {",
    "  static var appShortcuts: [AppShortcut] {",
    "    AppShortcut(intent: CreateNote(), phrases: [\"Create a note\"], shortTitle: \"Create a note\", systemImageName: \"note\")",
    "  }",
    "}"
  ].join("\n")
};

const schemaBacked = {
  path: "Sources/App/Notes.swift",
  contents: [
    "import AppIntents",
    "import AppIntentsTesting",
    "",
    "@AppEntity(schema: .notes.note)",
    "struct NoteEntity: AppEntity {",
    "  static var defaultQuery = NoteQuery()",
    "}",
    "",
    "struct NoteQuery: EntityQuery {",
    "}",
    "",
    "@AppIntent(schema: .notes.createNote)",
    "struct CreateNote: AppIntent {",
    "}",
    "",
    "extension NoteEntity: Transferable {",
    "}",
    "",
    "struct IndexedNote: IndexedEntity {",
    "}"
  ].join("\n")
};

describe("audit detection", () => {
  it("detects a shortcut provider and its surfacing capability", () => {
    const capabilities = detectedCapabilities(detectSources([providerOnly]));
    expect(capabilities.has("foundation.shortcuts-provider")).toBe(true);
    expect(capabilities.has("proof.shortcuts-surface")).toBe(true);
  });

  it("keeps a shortcuts-only project out of the schema claim", () => {
    const detections = detectSources([providerOnly]);
    expect(hasSchemaEvidence(detections)).toBe(false);
    expect([...detectedCapabilities(detections)].some((id) => id.startsWith("semantics."))).toBe(false);
  });

  it("detects schema conformances and supporting capabilities", () => {
    const capabilities = detectedCapabilities(detectSources([schemaBacked]));
    for (const id of [
      "semantics.schema-entity",
      "semantics.schema-intent",
      "discovery.entity-query",
      "discovery.indexed-entity",
      "cross-app.transferable",
      "proof.app-intents-testing"
    ]) {
      expect(capabilities.has(id)).toBe(true);
    }
    expect(hasSchemaEvidence(detectSources([schemaBacked]))).toBe(true);
  });

  it("records the file and the line of every detection", () => {
    const detections = detectSources([schemaBacked]);
    expect(evidenceFor(detections, "semantics.schema-entity")[0]).toEqual({
      capability: "semantics.schema-entity",
      path: "Sources/App/Notes.swift",
      line: 4,
      kind: "swift"
    });
    expect(evidenceFor(detections, "proof.app-intents-testing")[0]).toEqual({
      capability: "proof.app-intents-testing",
      path: "Sources/App/Notes.swift",
      line: 2,
      kind: "test"
    });
  });

  it("does not mistake an AppIntentsPackage for an AppIntent", () => {
    const detections = detectSources([
      { path: "Sources/App/Package.swift", contents: "struct Pkg: AppIntentsPackage {\n}" }
    ]);
    expect(detectedCapabilities(detections).has("foundation.app-intent")).toBe(false);
  });
});

describe("schema domains", () => {
  const source = (path: string, lines: readonly string[]) => ({ path, contents: lines.join("\n") });

  it("counts the intents and the entities each domain conforms", () => {
    const domains = detectSchemaDomains([
      source("Sources/App/Reader.swift", [
        "@AppEntity(schema: .reader.page)",
        "@AppEntity(schema: .reader.document)",
        "@AppIntent(schema: .reader.openPage)",
        "@AppIntent(schema: .calendar.createEvent)"
      ])
    ]);
    expect(domains).toEqual([
      { domain: "calendar", intents: 1, entities: 0, path: "Sources/App/Reader.swift" },
      { domain: "reader", intents: 1, entities: 2, path: "Sources/App/Reader.swift" }
    ]);
  });

  it("separates a complete domain from a partial one", () => {
    const domains = detectSchemaDomains([
      source("Sources/App/Reader.swift", ["@AppEntity(schema: .reader.page)", "@AppIntent(schema: .reader.openPage)"]),
      source("Sources/App/Calendar.swift", ["@AppIntent(schema: .calendar.createEvent)"])
    ]);
    expect(completeSchemaDomains(domains).map((domain) => domain.domain)).toEqual(["reader"]);
    expect(partialSchemaDomains(domains).map((domain) => domain.domain)).toEqual(["calendar"]);
  });
});
