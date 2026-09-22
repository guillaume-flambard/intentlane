import { describe, expect, it } from "vitest";
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
