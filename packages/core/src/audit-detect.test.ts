import { describe, expect, it } from "vitest";
import {
  completeSchemaDomains,
  detectExecutionTargets,
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

  it("never renders a property query as an entity query", () => {
    // `EntityPropertyQuery` refines `EntityQuery` in the SDK, so a detector
    // that matched the supertype name would file a property query under the
    // entity-query capability. Its resolution granularity is a different
    // surface and the report has to keep the two apart.
    const capabilities = detectedCapabilities(
      detectSources([{ path: "Sources/App/Note.swift", contents: "struct NoteQuery: EntityPropertyQuery {\n}" }])
    );
    expect(capabilities.has("discovery.entity-property-query")).toBe(true);
    expect(capabilities.has("discovery.entity-query")).toBe(false);
  });

  it("separates a rich value from a scalar parameter and a union from an optional", () => {
    const rich = detectedCapabilities(
      detectSources([
        {
          path: "Sources/App/Link.swift",
          contents: "struct NoteLink: IntentValueRepresentation<Note, String> {\n}\nstruct Note: Transferable {\n}\n"
        }
      ])
    );
    expect(rich.has("parameters.rich-value")).toBe(true);
    expect(rich.has("parameters.union")).toBe(false);

    const union = detectedCapabilities(
      detectSources([
        { path: "Sources/App/Target.swift", contents: "enum Target: AppUnionValue {\n}\nstruct Opt {\n  var title: String?\n}\n" }
      ])
    );
    expect(union.has("parameters.union")).toBe(true);
    // A union parameter is not an optional parameter, and a scalar `@Parameter`
    // is neither a union nor a rich value. An optional stays ordinary.
    expect(union.has("parameters.rich-value")).toBe(false);
    expect(union.has("foundation.parameters")).toBe(false);
  });

  it("signals an intent restricted to an extension as unreachable from the main process", () => {
    const scopes = detectExecutionTargets([
      {
        path: "Sources/App/Extension.swift",
        contents: [
          "struct RunInBackground: AppIntent {",
          "  static var allowedExecutionTargets: IntentExecutionTargets { .appIntentsExtension }",
          "}"
        ].join("\n")
      }
    ]);
    expect(scopes).toEqual([
      {
        path: "Sources/App/Extension.swift",
        line: 2,
        targets: ["appIntentsExtension"],
        restrictsTargets: true,
        reachesMainProcess: false
      }
    ]);
  });

  it("names the default target without judging reachability for an unrestricted intent", () => {
    const scopes = detectExecutionTargets([
      {
        path: "Sources/App/Anywhere.swift",
        contents: "struct Anywhere: AppIntent {\n  static var allowedExecutionTargets: IntentExecutionTargets { .default }\n}"
      }
    ]);
    // `.default` is a target the SDK declares, so reachability is judged: the
    // intent does not name an extension, so the main process reaches it.
    expect(scopes[0]?.targets).toEqual(["default"]);
    expect(scopes[0]?.reachesMainProcess).toBe(true);

    // An intent that names no target inherits the SDK default. The report names
    // that default and the alternatives the SDK declares, and stops there
    // rather than deciding for the project.
    const inherited = detectExecutionTargets([
      { path: "Sources/App/Silent.swift", contents: "struct Silent: AppIntent {\n}\n" }
    ]);
    expect(inherited).toEqual([]);
  });

  it("only names the execution targets the SDK declares", () => {
    // A computed body naming a project symbol is not an SDK target, so the
    // report carries no verdict instead of guessing where the intent runs.
    const scopes = detectExecutionTargets([
      {
        path: "Sources/App/Computed.swift",
        contents: "struct Computed: AppIntent {\n  static var allowedExecutionTargets: IntentExecutionTargets { Self.shared.targets }\n}"
      }
    ]);
    expect(scopes).toEqual([
      {
        path: "Sources/App/Computed.swift",
        line: 2,
        targets: ["default"],
        restrictsTargets: false,
        reachesMainProcess: undefined
      }
    ]);
  });

  it("detects a snippet intent and the result that shows its view", () => {
    const capabilities = detectedCapabilities(
      detectSources([
        {
          path: "Sources/App/Snippet.swift",
          contents: "struct ShowCard: SnippetIntent {\n}\nstruct Card: IntentResult, ShowsSnippetView {\n}\n"
        }
      ])
    );
    expect(capabilities.has("execution.snippet")).toBe(true);
    expect(capabilities.has("execution.snippet-view")).toBe(true);
  });

  it("separates an app behind the model protocol from one bound to the system model", () => {
    const abstracted = detectedCapabilities(
      detectSources([{ path: "Sources/App/Runner.swift", contents: "struct Runner: LanguageModel {\n}\n" }])
    );
    // An app behind the protocol can escalate to another implementation later,
    // which changes what it has to prove, so the two are not the same fact.
    expect(abstracted.has("models.language-model")).toBe(true);
    expect(abstracted.has("models.system-language-model")).toBe(false);

    const bound = detectedCapabilities(
      detectSources([{ path: "Sources/App/Local.swift", contents: "let model = SystemLanguageModel.default\n" }])
    );
    expect(bound.has("models.system-language-model")).toBe(true);
    expect(bound.has("models.language-model")).toBe(false);
  });

  it("separates a cloud escalation from a local model call", () => {
    const local = detectedCapabilities(
      detectSources([
        { path: "Sources/App/Local.swift", contents: "let model = SystemLanguageModel.default\nlet options = GenerationOptions()\n" }
      ])
    );
    expect(local.has("models.generation-options")).toBe(true);
    expect(local.has("models.private-cloud")).toBe(false);

    const cloud = detectedCapabilities(
      detectSources([{ path: "Sources/App/Cloud.swift", contents: "let model = PrivateCloudComputeLanguageModel.default\n" }])
    );
    expect(cloud.has("models.private-cloud")).toBe(true);
    expect(cloud.has("models.system-language-model")).toBe(false);
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
